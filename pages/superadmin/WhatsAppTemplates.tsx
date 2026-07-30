import { YcloudTester } from '../../components/YcloudTester';
 import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Plus, Edit2, Trash2, Save, X, Loader2, MessageSquare, Info, AlertCircle, CheckCircle, Smartphone, Sparkles
} from 'lucide-react';
import { GlobalWhatsAppTemplate } from '../../types';

export const WhatsAppTemplates = () => {
  const { globalSettings, updateGlobalSettings } = useApp();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Form State
  const [action, setAction] = useState('LAB_DISPATCH');
  const [name, setName] = useState('');
  const [body, setBody] = useState('');
  const [active, setActive] = useState(true);
  const [metaTemplateName, setMetaTemplateName] = useState('');

  
  

  

  const templatesList = globalSettings?.globalWhatsappTemplates || [];

  const actionsConfig: Record<string, { label: string, system: string, vars: string, example: string }> = {
    'LAB_DISPATCH': {
      label: 'Laboratório: Trabalho em Rota (Entrega)',
      system: 'LAB',
      vars: '{{dentist_name}}, {{jobs_list}}',
      example: 'Olá Dr(a) {{dentist_name}}, os seguintes trabalhos acabaram de sair para entrega:\n\n{{jobs_list}}'
    },
    'LAB_DELIVERED': {
      label: 'Laboratório: Trabalho Entregue',
      system: 'LAB',
      vars: '{{dentist_name}}, {{jobs_list}}',
      example: 'Olá Dr(a) {{dentist_name}}, seu trabalho foi entregue com sucesso:\n\n{{jobs_list}}'
    },
    'CLINIC_APPOINTMENT': {
      label: 'Clínica: Consulta Agendada (Convite)',
      system: 'CLINIC',
      vars: '{{patient_name}}, {{date}}, {{time}}',
      example: 'Olá {{patient_name}}, sua consulta está agendada para {{date}} às {{time}}. Responda 1 para CONFIRMAR ou 2 para CANCELAR.'
    },
    'CLINIC_APPOINTMENT_CONFIRMED': {
      label: 'Clínica: Confirmação Recebida',
      system: 'CLINIC',
      vars: '{{patient_name}}, {{date}}, {{time}}',
      example: 'Olá {{patient_name}}, sua consulta do dia {{date}} às {{time}} foi confirmada com sucesso!'
    },
    'CLINIC_APPOINTMENT_CANCELED': {
      label: 'Clínica: Cancelamento Recebido',
      system: 'CLINIC',
      vars: '{{patient_name}}, {{date}}, {{time}}',
      example: 'Olá {{patient_name}}, sua consulta do dia {{date}} às {{time}} foi cancelada.'
    },
    'SUPPLIER_UPDATE': {
      label: 'Fornecedor: Atualização de Pedido',
      system: 'SUPPLIER',
      vars: '{{order_id}}, {{status}}',
      example: 'Olá, seu pedido {{order_id}} teve o status atualizado para: {{status}}.'
    }
  };

  const handleOpenAdd = () => {
    setAction('LAB_DISPATCH');
    setName('');
    setBody(actionsConfig['LAB_DISPATCH'].example);
    setMetaTemplateName('');
    setActive(true);
    setEditingId('new');
    setMessage(null);
  };

  const handleOpenEdit = (t: GlobalWhatsAppTemplate) => {
    setAction(t.action);
    setName(t.name);
    setBody(t.body);
    setMetaTemplateName(t.metaTemplateName || '');
    setActive(t.active);
    setEditingId(t.id);
    setMessage(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setMessage({ type: 'error', text: 'O nome do modelo é obrigatório.' });
      return;
    }
    if (!body.trim()) {
      setMessage({ type: 'error', text: 'O corpo da mensagem é obrigatório.' });
      return;
    }

    setIsSaving(true);
    setMessage(null);

    try {
      const updatedTemplates = [...templatesList];
      
      if (editingId === 'new') {
        const newTemplate: GlobalWhatsAppTemplate = {
          id: `global_tpl_${Date.now()}`,
          action,
          name: name.trim(),
          body: body.trim(),
          active,
          metaTemplateName: metaTemplateName.trim()
        };
        updatedTemplates.push(newTemplate);
      } else {
        const index = updatedTemplates.findIndex(t => t.id === editingId);
        if (index !== -1 && editingId) {
          updatedTemplates[index] = {
            id: editingId,
            action,
            name: name.trim(),
            body: body.trim(),
            active,
            metaTemplateName: metaTemplateName.trim()
          };
        }
      }

      await updateGlobalSettings({
        globalWhatsappTemplates: updatedTemplates
      });

      setMessage({ type: 'success', text: 'Modelo salvo com sucesso!' });
      setEditingId(null);
    } catch (err: any) {
      console.error(err);
      setMessage({ type: 'error', text: 'Erro ao salvar o modelo de mensagem.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este modelo global? Todas as ações correspondentes deixarão de dispará-lo.')) {
      return;
    }

    setIsSaving(true);
    setMessage(null);

    try {
      const updatedTemplates = templatesList.filter(t => t.id !== id);
      await updateGlobalSettings({
        globalWhatsappTemplates: updatedTemplates
      });
      setMessage({ type: 'success', text: 'Modelo excluído com sucesso.' });
    } catch (err: any) {
      console.error(err);
      setMessage({ type: 'error', text: 'Erro ao excluir o modelo.' });
    } finally {
      setIsSaving(false);
    }
  };



  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Modelos de Mensagem WhatsApp</h1>
          <p className="text-slate-500">Defina os modelos padrão disparados pelas ações de cada sistema da plataforma.</p>
        </div>
        <button 
          onClick={handleOpenAdd}
          className="px-6 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-2xl shadow-xl shadow-blue-200 transition-all flex items-center gap-2 text-sm uppercase tracking-wider"
        >
          <Plus size={18} /> Novo Modelo Global
        </button>
      </div>





      {message && (
        <div className={`p-4 rounded-2xl border flex items-center gap-3 ${
          message.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          {message.type === 'success' ? <CheckCircle className="shrink-0" size={20} /> : <AlertCircle className="shrink-0" size={20} />}
          <span className="text-sm font-bold">{message.text}</span>
        </div>
      )}

      {editingId && (
        <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-lg animate-in zoom-in-95 duration-200">
          <div className="flex justify-between items-center pb-6 border-b border-slate-100 mb-6">
            <h3 className="text-xl font-black text-slate-800 flex items-center gap-2 uppercase tracking-tight">
              <MessageSquare className="text-blue-600" size={20} />
              {editingId === 'new' ? 'Criar Novo Modelo Global' : 'Editar Modelo Global'}
            </h3>
            <button onClick={() => setEditingId(null)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSave} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block mb-2 text-xs font-black text-slate-500 uppercase tracking-widest">Ação do Sistema</label>
                <select
                  value={action}
                  onChange={(e) => {
                    setAction(e.target.value);
                    if (editingId === 'new') {
                      setBody(actionsConfig[e.target.value].example);
                    }
                  }}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  {Object.entries(actionsConfig).map(([key, config]) => (
                    <option key={key} value={key}>
                      [{config.system}] {config.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block mb-2 text-xs font-black text-slate-500 uppercase tracking-widest">Nome Identificador</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Motoboy em Rota de Entrega"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block mb-2 text-xs font-black text-slate-500 uppercase tracking-widest">Nome do Template Oficial (Meta/YCloud) - Opcional</label>
              <input
                type="text"
                value={metaTemplateName}
                onChange={(e) => setMetaTemplateName(e.target.value)}
                placeholder="Ex: trabalho_entregue_v2"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="mt-1 text-xs text-slate-500">Se preenchido, o sistema enviará a notificação usando este modelo pré-aprovado pela Meta, suportando o envio fora da janela de 24h. As variáveis serão passadas na mesma ordem que aparecem abaixo.</p>
            </div>

            <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100 space-y-2">
              <h4 className="text-xs font-black text-blue-800 uppercase tracking-widest flex items-center gap-1.5">
                <Info size={14} /> Variáveis de Substituição Suportadas
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                Esta ação suporta a substituição automática das seguintes variáveis no corpo do texto:
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                {actionsConfig[action].vars.split(', ').map(v => (
                  <span key={v} className="text-[10px] font-mono font-bold bg-white text-blue-600 px-2 py-1 rounded-md border border-blue-100">
                    {v}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <label className="block mb-2 text-xs font-black text-slate-500 uppercase tracking-widest">Corpo da Mensagem (WhatsApp)</label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Insira o texto que será enviado..."
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-mono text-slate-800 outline-none focus:ring-2 focus:ring-blue-500 min-h-[120px]"
                required
              />
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="active"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
                className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="active" className="text-sm font-black text-slate-700 uppercase tracking-wider cursor-pointer">
                Modelo Ativo (Dispara automaticamente quando a ação ocorrer)
              </label>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditingId(null)}
                className="px-6 py-3 text-slate-500 font-bold hover:bg-slate-100 rounded-2xl transition-all"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-8 py-3 bg-slate-900 text-white font-black rounded-2xl shadow-xl flex items-center gap-2 disabled:opacity-50"
              >
                {isSaving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                SALVAR MODELO
              </button>
            </div>
          </form>
        </div>
      )}

      
      {/* Templates List */}

      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h3 className="text-lg font-bold text-slate-800">Modelos Globais Ativos</h3>
            <p className="text-xs text-slate-400">Modelos cadastrados para notificações automáticas do sistema.</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={async () => {
                if (!window.confirm('Deseja carregar o conjunto padrão de modelos recomendados para Laboratórios, Clínicas e Fornecedores?')) return;
                setIsSaving(true);
                try {
                  const defaultTpls: GlobalWhatsAppTemplate[] = [
                    {
                      id: `global_tpl_lab_dispatch`,
                      action: 'LAB_DISPATCH',
                      name: 'Laboratório: Trabalho em Rota de Entrega',
                      body: 'Olá Dr(a) {{dentist_name}}, os seguintes trabalhos do laboratório acabaram de sair para entrega com o entregador:\n\n{{jobs_list}}\n\nAcompanhe o recebimento em seu consultório!',
                      metaTemplateName: 'lab_trabalho_em_rota',
                      active: true
                    },
                    {
                      id: `global_tpl_lab_delivered`,
                      action: 'LAB_DELIVERED',
                      name: 'Laboratório: Trabalho Entregue',
                      body: 'Olá Dr(a) {{dentist_name}}, confirmamos que os seguintes trabalhos foram entregues com sucesso no seu consultório:\n\n{{jobs_list}}\n\nQualquer dúvida estamos à disposição!',
                      metaTemplateName: 'lab_trabalho_entregue',
                      active: true
                    },
                    {
                      id: `global_tpl_clinic_app`,
                      action: 'CLINIC_APPOINTMENT',
                      name: 'Clínica: Lembrete e Confirmação de Consulta',
                      body: 'Olá {{patient_name}}, sua consulta está agendada para o dia {{date}} às {{time}}.\n\nPor favor, responda:\n1️⃣ para CONFIRMAR sua presença\n2️⃣ para CANCELAR ou solicitar reagendamento.',
                      metaTemplateName: 'clinica_lembrete_consulta',
                      active: true
                    },
                    {
                      id: `global_tpl_clinic_conf`,
                      action: 'CLINIC_APPOINTMENT_CONFIRMED',
                      name: 'Clínica: Confirmação Registrada',
                      body: 'Olá {{patient_name}}, recebemos sua confirmação! Sua consulta para o dia {{date}} às {{time}} está confirmada. Te esperamos!',
                      metaTemplateName: 'clinica_consulta_confirmada',
                      active: true
                    },
                    {
                      id: `global_tpl_clinic_canc`,
                      action: 'CLINIC_APPOINTMENT_CANCELED',
                      name: 'Clínica: Cancelamento / Reagendamento Solicitado',
                      body: 'Olá {{patient_name}}, informamos que sua consulta do dia {{date}} às {{time}} foi cancelada. Nossa equipe entrará em contato para reagendamento.',
                      metaTemplateName: 'clinica_consulta_cancelada',
                      active: true
                    },
                    {
                      id: `global_tpl_supplier_upd`,
                      action: 'SUPPLIER_UPDATE',
                      name: 'Fornecedor: Status de Pedido / Entrega',
                      body: 'Olá, informamos que o status do seu pedido #{{order_id}} foi atualizado para: *{{status}}*.\n\nAcompanhe o progresso diretamente em nosso portal!',
                      metaTemplateName: 'fornecedor_status_pedido',
                      active: true
                    }
                  ];

                  // Merge preserving existing ones that don't collide
                  const existingIds = new Set(templatesList.map(t => t.action));
                  const newEntries = defaultTpls.filter(t => !existingIds.has(t.action));
                  const merged = [...templatesList, ...newEntries];

                  await updateGlobalSettings({ globalWhatsappTemplates: merged });
                  setMessage({ type: 'success', text: 'Modelos recomendados carregados com sucesso!' });
                } catch (err) {
                  console.error(err);
                  setMessage({ type: 'error', text: 'Erro ao carregar modelos padrão.' });
                } finally {
                  setIsSaving(false);
                }
              }}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5"
            >
              <Sparkles size={14} className="text-amber-500" />
              Carregar Modelos Recomendados
            </button>
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-3 py-2 rounded-xl border border-slate-100">
              {templatesList.length} Modelos
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 gap-6">
            {templatesList.map((tpl) => {
              const config = actionsConfig[tpl.action];
              return (
                <div key={tpl.id} className="border border-slate-100 rounded-2xl p-6 bg-slate-50/50 hover:bg-slate-50 transition-all flex flex-col md:flex-row justify-between gap-6">
                  <div className="space-y-3 flex-1">
                    <div className="flex items-center flex-wrap gap-2">
                      <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 bg-blue-100 text-blue-700 rounded-lg">
                        {config?.system || 'GERAL'}
                      </span>
                      <h4 className="font-black text-slate-800 text-base">{tpl.name}</h4>
                      {tpl.active ? (
                        <span className="text-[9px] font-black uppercase bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-md border border-emerald-100">Ativo</span>
                      ) : (
                        <span className="text-[9px] font-black uppercase bg-slate-100 text-slate-400 px-2 py-0.5 rounded-md border border-slate-200">Inativo</span>
                      )}
                    </div>
                    
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                      Gatilho: <span className="text-slate-600">{config?.label || tpl.action}</span>
                    </p>

                    <div className="bg-white p-4 rounded-xl border border-slate-200/50 text-sm text-slate-600 font-mono whitespace-pre-wrap leading-relaxed shadow-inner">
                      {tpl.body}
                    </div>

                    <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold uppercase">
                      <Smartphone size={12} className="text-slate-400" />
                      <span>Variáveis:</span>
                      <span className="text-slate-500 font-mono">{config?.vars || 'Nenhuma'}</span>
                    </div>
                  </div>

                  <div className="flex md:flex-col justify-end gap-2 shrink-0 md:border-l md:border-slate-100 md:pl-6">
                    <button
                      onClick={() => handleOpenEdit(tpl)}
                      className="p-3 text-slate-500 hover:text-blue-600 hover:bg-white rounded-xl border border-slate-200/50 hover:border-blue-200 transition-all flex items-center justify-center gap-2 font-bold text-xs shadow-sm bg-white md:w-full"
                    >
                      <Edit2 size={14} /> EDITAR
                    </button>
                    <button
                      onClick={() => handleDelete(tpl.id)}
                      className="p-3 text-slate-400 hover:text-rose-600 hover:bg-white rounded-xl border border-slate-200/50 hover:border-rose-200 transition-all flex items-center justify-center gap-2 font-bold text-xs shadow-sm bg-white md:w-full"
                    >
                      <Trash2 size={14} /> EXCLUIR
                    </button>
                  </div>
                </div>
              );
            })}

            {templatesList.length === 0 && (
              <div className="text-center py-16 text-slate-400 italic flex flex-col items-center justify-center gap-3">
                <MessageSquare size={48} className="opacity-20" />
                <div>
                  <p className="font-bold text-slate-500 not-italic">Nenhum modelo global configurado.</p>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">Crie modelos para disparar automaticamente no WhatsApp dos seus clientes e pacientes quando eventos ocorrerem no sistema.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      <YcloudTester />
    </div>
  );
};
