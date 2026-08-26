import React, { useState, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Plus, Edit2, Trash2, Save, X, Loader2, MessageSquare, Info, AlertCircle, 
  CheckCircle, Smartphone, Sparkles, Copy, Check, Search, Filter, 
  ToggleLeft, ToggleRight, ArrowRight, ShieldCheck, Tag, HelpCircle, Layers, RefreshCw
} from 'lucide-react';
import { GlobalWhatsAppTemplate } from '../../types';
import { YcloudTester } from '../../components/YcloudTester';

export const WhatsAppTemplates = () => {
  const { globalSettings, updateGlobalSettings } = useApp();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'ALL' | 'LAB' | 'CLINIC' | 'SUPPLIER' | 'ACTIVE' | 'INACTIVE'>('ALL');

  // Quick inline edit state for Meta Template Name
  const [quickEditId, setQuickEditId] = useState<string | null>(null);
  const [quickMetaName, setQuickMetaName] = useState('');

  // Form State
  const [action, setAction] = useState('LAB_DELIVERED');
  const [customAction, setCustomAction] = useState('');
  const [name, setName] = useState('');
  const [body, setBody] = useState('');
  const [active, setActive] = useState(true);
  const [metaTemplateName, setMetaTemplateName] = useState('');
  const [language, setLanguage] = useState('pt_BR');

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const testerRef = useRef<HTMLDivElement>(null);

  const templatesList: GlobalWhatsAppTemplate[] = globalSettings?.globalWhatsappTemplates || [];

  const actionsConfig: Record<string, { label: string, system: 'LAB' | 'CLINIC' | 'SUPPLIER' | 'GERAL', vars: string[], example: string, defaultMeta: string, defaultLanguage?: string }> = {
    'LAB_DELIVERED': {
      label: 'Laboratório: Trabalho Entregue ao Dentista',
      system: 'LAB',
      vars: ['dentist_name', 'jobs_list'],
      example: 'Olá Dr(a) {{dentist_name}}, confirmamos que os seguintes trabalhos foram entregues com sucesso:\n\n{{jobs_list}}\n\nQualquer dúvida estamos à disposição!',
      defaultMeta: 'lab_trabalho_entregue',
      defaultLanguage: 'pt_BR'
    },
    'LAB_DISPATCH': {
      label: 'Laboratório: Trabalho em Rota de Entrega (Motoboy)',
      system: 'LAB',
      vars: ['dentist_name', 'jobs_list'],
      example: 'Olá Dr(a) {{dentist_name}}, os seguintes trabalhos acabaram de sair para entrega com o entregador:\n\n{{jobs_list}}',
      defaultMeta: 'lab_trabalho_em_rota',
      defaultLanguage: 'pt_BR'
    },
    'CLINIC_APPOINTMENT': {
      label: 'Clínica: Consulta Agendada (Convite / Lembrete)',
      system: 'CLINIC',
      vars: ['patient_name', 'date', 'time'],
      example: 'Olá {{patient_name}}, sua consulta está agendada para {{date}} às {{time}}.\n\nPor favor, responda 1 para CONFIRMAR ou 2 para CANCELAR.',
      defaultMeta: 'clinica_lembrete_consulta',
      defaultLanguage: 'pt_BR'
    },
    'CLINIC_APPOINTMENT_CONFIRMED': {
      label: 'Clínica: Confirmação de Consulta Recebida',
      system: 'CLINIC',
      vars: ['patient_name', 'date', 'time'],
      example: 'Olá {{patient_name}}, recebemos sua confirmação! Sua consulta para {{date}} às {{time}} está confirmada.',
      defaultMeta: 'clinica_consulta_confirmada',
      defaultLanguage: 'pt_BR'
    },
    'CLINIC_APPOINTMENT_CANCELED': {
      label: 'Clínica: Cancelamento de Consulta Registrado',
      system: 'CLINIC',
      vars: ['patient_name', 'date', 'time'],
      example: 'Olá {{patient_name}}, sua consulta do dia {{date}} às {{time}} foi cancelada conforme solicitado.',
      defaultMeta: 'clinica_consulta_cancelada',
      defaultLanguage: 'pt_BR'
    },
    'SUPPLIER_UPDATE': {
      label: 'Fornecedor: Atualização de Status do Pedido',
      system: 'SUPPLIER',
      vars: ['order_id', 'status'],
      example: 'Olá, informamos que o status do seu pedido #{{order_id}} foi atualizado para: *{{status}}*.',
      defaultMeta: 'fornecedor_status_pedido',
      defaultLanguage: 'pt_PT'
    },
    'CUSTOM': {
      label: 'Gatilho / Ação Personalizada',
      system: 'GERAL',
      vars: ['nome', 'codigo', 'detalhes'],
      example: 'Olá {{nome}}, notificamos sobre {{detalhes}} (Código: {{codigo}}).',
      defaultMeta: 'custom_notification',
      defaultLanguage: 'pt_BR'
    }
  };

  // Helper to sanitize name into Meta template naming convention (lowercase, underscores, no accents)
  const sanitizeForMeta = (text: string) => {
    return text
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // remove accents
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '_') // replace spaces and special chars with underscores
      .replace(/_+/g, '_') // collapse multiple underscores
      .replace(/^_|_$/g, ''); // trim underscores
  };

  const handleOpenAdd = () => {
    setAction('LAB_DELIVERED');
    setCustomAction('');
    setName('Laboratório: Trabalho Entregue');
    setBody(actionsConfig['LAB_DELIVERED'].example);
    setMetaTemplateName('lab_trabalho_entregue');
    setLanguage('pt_BR');
    setActive(true);
    setEditingId('new');
    setMessage(null);
  };

  const handleOpenEdit = (t: GlobalWhatsAppTemplate) => {
    const isStandard = Object.keys(actionsConfig).includes(t.action);
    if (isStandard) {
      setAction(t.action);
      setCustomAction('');
    } else {
      setAction('CUSTOM');
      setCustomAction(t.action);
    }
    setName(t.name);
    setBody(t.body);
    setMetaTemplateName(t.metaTemplateName || '');
    setLanguage(t.language || 'pt_BR');
    setActive(t.active);
    setEditingId(t.id);
    setMessage(null);
  };

  const handleDuplicate = (t: GlobalWhatsAppTemplate) => {
    const isStandard = Object.keys(actionsConfig).includes(t.action);
    if (isStandard) {
      setAction(t.action);
      setCustomAction('');
    } else {
      setAction('CUSTOM');
      setCustomAction(t.action);
    }
    setName(`${t.name} (Cópia)`);
    setBody(t.body);
    setMetaTemplateName(t.metaTemplateName ? `${t.metaTemplateName}_copia` : '');
    setLanguage(t.language || 'pt_BR');
    setActive(t.active);
    setEditingId('new');
    setMessage({ type: 'success', text: 'Modelo clonado! Ajuste os campos e clique em Salvar.' });
  };

  const handleInsertVariable = (varName: string) => {
    if (!textareaRef.current) return;
    const tag = `{{${varName}}}`;
    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    const newBody = body.substring(0, start) + tag + body.substring(end);
    setBody(newBody);
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(start + tag.length, start + tag.length);
      }
    }, 50);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setMessage({ type: 'error', text: 'O nome identificador do modelo é obrigatório.' });
      return;
    }
    if (!body.trim()) {
      setMessage({ type: 'error', text: 'O corpo da mensagem é obrigatório.' });
      return;
    }

    const finalAction = action === 'CUSTOM' ? (customAction.trim().toUpperCase() || 'CUSTOM') : action;
    const finalMetaName = metaTemplateName.trim();

    setIsSaving(true);
    setMessage(null);

    try {
      const updatedTemplates = [...templatesList];
      
      if (editingId === 'new') {
        const newTemplate: GlobalWhatsAppTemplate = {
          id: `global_tpl_${Date.now()}`,
          action: finalAction,
          name: name.trim(),
          body: body.trim(),
          active,
          metaTemplateName: finalMetaName,
          language: language.trim() || 'pt_BR'
        };
        updatedTemplates.push(newTemplate);
      } else {
        const index = updatedTemplates.findIndex(t => t.id === editingId);
        if (index !== -1 && editingId) {
          updatedTemplates[index] = {
            id: editingId,
            action: finalAction,
            name: name.trim(),
            body: body.trim(),
            active,
            metaTemplateName: finalMetaName,
            language: language.trim() || 'pt_BR'
          };
        }
      }

      await updateGlobalSettings({
        globalWhatsappTemplates: updatedTemplates
      });

      setMessage({ type: 'success', text: 'Modelo de WhatsApp salvo com sucesso!' });
      setEditingId(null);
    } catch (err: any) {
      console.error(err);
      setMessage({ type: 'error', text: 'Erro ao salvar o modelo de mensagem.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleQuickSaveMetaName = async (templateId: string) => {
    setIsSaving(true);
    try {
      const updatedTemplates = templatesList.map(t => {
        if (t.id === templateId) {
          return { ...t, metaTemplateName: quickMetaName.trim() };
        }
        return t;
      });
      await updateGlobalSettings({ globalWhatsappTemplates: updatedTemplates });
      setQuickEditId(null);
      setMessage({ type: 'success', text: 'Nome do modelo Meta atualizado com sucesso!' });
    } catch (err) {
      setMessage({ type: 'error', text: 'Erro ao atualizar nome do modelo Meta.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = async (templateId: string, currentActive: boolean) => {
    setIsSaving(true);
    try {
      const updatedTemplates = templatesList.map(t => {
        if (t.id === templateId) {
          return { ...t, active: !currentActive };
        }
        return t;
      });
      await updateGlobalSettings({ globalWhatsappTemplates: updatedTemplates });
      setMessage({ type: 'success', text: `Modelo ${!currentActive ? 'ativado' : 'desativado'} com sucesso!` });
    } catch (err) {
      setMessage({ type: 'error', text: 'Erro ao alterar status do modelo.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este modelo global? As ações correspondentes deixarão de dispará-lo.')) {
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

  const handleSyncOfficialTemplates = async () => {
    if (!window.confirm('Deseja sincronizar os modelos cadastrados no seu painel YCloud/Meta (lab_trabalho_entregue, lab_trabalho_em_rota, clinica_lembrete_consulta, clinica_consulta_confirmada, clinica_consulta_cancelada, fornecedor_status_pedido)?')) {
      return;
    }
    setIsSaving(true);
    try {
      const officialTemplates: GlobalWhatsAppTemplate[] = [
        {
          id: 'tpl_lab_delivered',
          action: 'LAB_DELIVERED',
          name: 'Laboratório: Trabalho Entregue ao Dentista',
          metaTemplateName: 'lab_trabalho_entregue',
          language: 'pt_BR',
          body: actionsConfig['LAB_DELIVERED'].example,
          active: true
        },
        {
          id: 'tpl_lab_dispatch',
          action: 'LAB_DISPATCH',
          name: 'Laboratório: Trabalho em Rota de Entrega (Motoboy)',
          metaTemplateName: 'lab_trabalho_em_rota',
          language: 'pt_BR',
          body: actionsConfig['LAB_DISPATCH'].example,
          active: true
        },
        {
          id: 'tpl_clinic_appointment',
          action: 'CLINIC_APPOINTMENT',
          name: 'Clínica: Consulta Agendada (Convite / Lembrete)',
          metaTemplateName: 'clinica_lembrete_consulta',
          language: 'pt_BR',
          body: actionsConfig['CLINIC_APPOINTMENT'].example,
          active: true
        },
        {
          id: 'tpl_clinic_confirmed',
          action: 'CLINIC_APPOINTMENT_CONFIRMED',
          name: 'Clínica: Confirmação de Consulta Recebida',
          metaTemplateName: 'clinica_consulta_confirmada',
          language: 'pt_BR',
          body: actionsConfig['CLINIC_APPOINTMENT_CONFIRMED'].example,
          active: true
        },
        {
          id: 'tpl_clinic_canceled',
          action: 'CLINIC_APPOINTMENT_CANCELED',
          name: 'Clínica: Cancelamento de Consulta Registrado',
          metaTemplateName: 'clinica_consulta_cancelada',
          language: 'pt_BR',
          body: actionsConfig['CLINIC_APPOINTMENT_CANCELED'].example,
          active: true
        },
        {
          id: 'tpl_supplier_update',
          action: 'SUPPLIER_UPDATE',
          name: 'Fornecedor: Atualização de Status do Pedido',
          metaTemplateName: 'fornecedor_status_pedido',
          language: 'pt_PT',
          body: actionsConfig['SUPPLIER_UPDATE'].example,
          active: true
        }
      ];

      const customTemplates = templatesList.filter(t => !['LAB_DELIVERED', 'LAB_DISPATCH', 'CLINIC_APPOINTMENT', 'CLINIC_APPOINTMENT_CONFIRMED', 'CLINIC_APPOINTMENT_CANCELED', 'SUPPLIER_UPDATE'].includes(t.action));

      await updateGlobalSettings({
        globalWhatsappTemplates: [...officialTemplates, ...customTemplates]
      });

      setMessage({ type: 'success', text: 'Modelos sincronizados com sucesso com o catálogo da Meta / YCloud!' });
    } catch (err: any) {
      console.error(err);
      setMessage({ type: 'error', text: 'Erro ao sincronizar modelos: ' + err.message });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Filter templates
  const filteredTemplates = templatesList.filter(tpl => {
    const matchesSearch = 
      tpl.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tpl.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (tpl.metaTemplateName && tpl.metaTemplateName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      tpl.body.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (selectedCategory === 'ACTIVE') return tpl.active;
    if (selectedCategory === 'INACTIVE') return !tpl.active;
    if (selectedCategory === 'LAB') {
      const config = actionsConfig[tpl.action];
      return config?.system === 'LAB' || tpl.action.startsWith('LAB');
    }
    if (selectedCategory === 'CLINIC') {
      const config = actionsConfig[tpl.action];
      return config?.system === 'CLINIC' || tpl.action.startsWith('CLINIC');
    }
    if (selectedCategory === 'SUPPLIER') {
      const config = actionsConfig[tpl.action];
      return config?.system === 'SUPPLIER' || tpl.action.startsWith('SUPPLIER');
    }

    return true;
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-blue-100 text-blue-700 rounded-xl">
              <MessageSquare size={22} />
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Modelos de Mensagem WhatsApp
            </h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Configure e edite os nomes de modelos aprovados pela Meta/YCloud e os textos de notificações automáticas.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button 
            onClick={handleSyncOfficialTemplates}
            disabled={isSaving}
            title="Importa e configura os modelos exatamente conforme aprovados no seu painel YCloud"
            className="px-4 py-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold rounded-2xl shadow-sm transition-all flex items-center gap-2 text-xs sm:text-sm active:scale-95 disabled:opacity-50"
          >
            <RefreshCw size={17} className={isSaving ? 'animate-spin' : ''} />
            Sincronizar Modelos YCloud
          </button>
          <button 
            onClick={handleOpenAdd}
            className="px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-2xl shadow-lg shadow-blue-200 transition-all flex items-center gap-2 text-xs sm:text-sm uppercase tracking-wider active:scale-95"
          >
            <Plus size={18} /> Novo Modelo Global
          </button>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/70 p-5 rounded-3xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="p-2.5 bg-blue-600 text-white rounded-2xl shrink-0 shadow-md shadow-blue-200">
            <ShieldCheck size={22} />
          </div>
          <div>
            <h4 className="text-sm font-black text-blue-900">Integração com Meta WhatsApp Business API & YCloud</h4>
            <p className="text-xs text-blue-800/80 leading-relaxed mt-0.5 max-w-3xl">
              Para envios fora da janela de 24 horas (como avisos de entrega do laboratório), o campo <strong>Nome do Modelo na Meta</strong> deve corresponder exatamente ao identificador aprovado no painel da Meta (ex: <code className="bg-white/80 px-1.5 py-0.5 rounded text-blue-900 font-bold">lab_delivered</code>) com o idioma <code className="bg-white/80 px-1.5 py-0.5 rounded text-blue-900 font-bold">pt_BR</code>.
            </p>
          </div>
        </div>
      </div>

      {/* Alert Messages */}
      {message && (
        <div className={`p-4 rounded-2xl border flex items-center justify-between gap-3 shadow-sm ${
          message.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          <div className="flex items-center gap-3">
            {message.type === 'success' ? <CheckCircle className="shrink-0 text-emerald-600" size={20} /> : <AlertCircle className="shrink-0 text-rose-600" size={20} />}
            <span className="text-sm font-bold">{message.text}</span>
          </div>
          <button onClick={() => setMessage(null)} className="p-1 hover:bg-black/5 rounded-lg">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Modal / Form de Edição */}
      {editingId && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border-2 border-blue-200 shadow-xl shadow-blue-100/50 animate-in zoom-in-95 duration-200">
          <div className="flex justify-between items-center pb-5 border-b border-slate-100 mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-50 text-blue-600 rounded-2xl">
                <Edit2 size={20} />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-800 tracking-tight">
                  {editingId === 'new' ? 'Criar Novo Modelo de WhatsApp' : 'Editar Modelo de Mensagem WhatsApp'}
                </h3>
                <p className="text-xs text-slate-400 font-medium">Preencha o nome identificador, o nome oficial na Meta e o conteúdo.</p>
              </div>
            </div>
            <button 
              onClick={() => setEditingId(null)} 
              className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSave} className="space-y-6">
            {/* Linha 1: Nome Identificador & Gatilho */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block mb-1.5 text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Tag size={13} className="text-blue-600" /> Nome Identificador no Sistema
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Laboratório: Trabalho Entregue"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                  required
                />
                <p className="mt-1 text-[11px] text-slate-400">Nome exibido nas telas de configuração e relatórios.</p>
              </div>

              <div>
                <label className="block mb-1.5 text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers size={13} className="text-blue-600" /> Ação / Gatilho do Sistema
                </label>
                <select
                  value={action}
                  onChange={(e) => {
                    const newAction = e.target.value;
                    setAction(newAction);
                    if (actionsConfig[newAction]) {
                      if (editingId === 'new') {
                        setBody(actionsConfig[newAction].example);
                        setMetaTemplateName(actionsConfig[newAction].defaultMeta);
                        setName(actionsConfig[newAction].label);
                      }
                    }
                  }}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                >
                  {Object.entries(actionsConfig).map(([key, config]) => (
                    <option key={key} value={key}>
                      [{config.system}] {config.label}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-[11px] text-slate-400">Evento interno que dispara este disparo automático.</p>
              </div>
            </div>

            {action === 'CUSTOM' && (
              <div>
                <label className="block mb-1.5 text-xs font-black text-slate-700 uppercase tracking-wider">
                  Código da Ação Personalizada
                </label>
                <input
                  type="text"
                  value={customAction}
                  onChange={(e) => setCustomAction(e.target.value.toUpperCase())}
                  placeholder="Ex: MINHA_ACAO_CUSTOM"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-mono font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                  required
                />
              </div>
            )}

            {/* Linha 2: Configuração Meta / YCloud */}
            <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Smartphone size={16} className="text-blue-600" />
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                    Identificador Oficial na Meta (WhatsApp Business API)
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => setMetaTemplateName(sanitizeForMeta(metaTemplateName || name))}
                  className="text-[11px] font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1"
                  title="Remove espaços, acentos e formata em minúsculas"
                >
                  <Sparkles size={12} /> Formatar para padrão Meta
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="block mb-1 text-[11px] font-black text-slate-500 uppercase tracking-wider">
                    Nome do Modelo no Meta/YCloud (Slug Técnico)
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={metaTemplateName}
                      onChange={(e) => setMetaTemplateName(e.target.value)}
                      placeholder="Ex: lab_delivered ou trabalho_entregue"
                      className="w-full px-4 py-2.5 font-mono text-sm font-bold bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-800"
                    />
                  </div>
                  <p className="mt-1 text-[11px] text-slate-500">
                    O nome cadastrado no Gerenciador da Meta / Painel do YCloud (sem espaços e letras minúsculas).
                  </p>
                </div>

                <div>
                  <label className="block mb-1 text-[11px] font-black text-slate-500 uppercase tracking-wider">
                    Idioma Aprovado na Meta
                  </label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="pt_BR">Português (pt_BR)</option>
                    <option value="pt_PT">Português Portugal (pt_PT)</option>
                    <option value="en_US">Inglês (en_US)</option>
                    <option value="es_ES">Espanhol (es_ES)</option>
                  </select>
                  <p className="mt-1 text-[11px] text-slate-500">
                    Padrão: <span className="font-mono font-bold">pt_BR</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Variáveis Dinâmicas */}
            <div className="p-4 bg-blue-50/70 rounded-2xl border border-blue-100 space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black text-blue-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Info size={14} className="text-blue-600" /> Variáveis Disponíveis (Clique para Inserir)
                </h4>
                <span className="text-[10px] font-bold text-blue-600">Clique na tag para adicionar ao texto</span>
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                {(actionsConfig[action]?.vars || ['variavel']).map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => handleInsertVariable(v)}
                    className="text-xs font-mono font-bold bg-white hover:bg-blue-600 text-blue-700 hover:text-white px-3 py-1.5 rounded-xl border border-blue-200 shadow-sm transition-all flex items-center gap-1 active:scale-95"
                  >
                    + {`{{${v}}}`}
                  </button>
                ))}
              </div>
            </div>

            {/* Corpo da Mensagem */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-black text-slate-700 uppercase tracking-wider">
                  Corpo do Texto da Mensagem
                </label>
                <span className="text-[11px] font-mono text-slate-400">
                  {body.length} caracteres
                </span>
              </div>
              <textarea
                ref={textareaRef}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Insira o texto que será enviado ao cliente ou paciente..."
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-mono text-slate-800 outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white min-h-[140px] leading-relaxed"
                required
              />
            </div>

            {/* Switch Ativo / Inativo */}
            <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <button
                type="button"
                onClick={() => setActive(!active)}
                className="text-blue-600 focus:outline-none"
              >
                {active ? <ToggleRight size={32} className="text-emerald-500" /> : <ToggleLeft size={32} className="text-slate-300" />}
              </button>
              <div>
                <label className="text-sm font-black text-slate-800 uppercase tracking-wider block cursor-pointer" onClick={() => setActive(!active)}>
                  {active ? 'Modelo Ativo' : 'Modelo Inativo'}
                </label>
                <p className="text-xs text-slate-400">
                  {active 
                    ? 'O sistema disparará esta mensagem automaticamente quando o evento correspondente ocorrer.' 
                    : 'Disparo automático pausado temporariamente.'}
                </p>
              </div>
            </div>

            {/* Botões do Rodapé */}
            <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditingId(null)}
                className="px-6 py-3 text-slate-500 font-bold hover:bg-slate-100 rounded-2xl transition-all text-sm"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-8 py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-black rounded-2xl shadow-xl flex items-center justify-center gap-2 disabled:opacity-50 text-sm tracking-wider uppercase transition-all active:scale-95"
              >
                {isSaving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                SALVAR MODELO
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Quick Inline Modal to change Meta Template Name */}
      {quickEditId && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-black text-slate-800 text-lg flex items-center gap-2">
                <Smartphone className="text-blue-600" size={18} /> Editar Nome Meta / YCloud
              </h3>
              <button onClick={() => setQuickEditId(null)} className="p-1 hover:bg-slate-100 rounded-full text-slate-400">
                <X size={18} />
              </button>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Informe o identificador exato cadastrado no gerenciador da Meta (letras minúsculas e sem acentos).
            </p>
            <div className="space-y-3">
              <input
                type="text"
                value={quickMetaName}
                onChange={(e) => setQuickMetaName(e.target.value)}
                placeholder="Ex: lab_delivered"
                className="w-full px-4 py-3 font-mono font-bold text-sm bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setQuickMetaName(sanitizeForMeta(quickMetaName))}
                className="text-xs text-blue-600 hover:underline font-bold flex items-center gap-1"
              >
                <Sparkles size={12} /> Auto-formatar para padrão Meta
              </button>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                type="button"
                onClick={() => setQuickEditId(null)}
                className="px-4 py-2 text-slate-500 font-bold rounded-xl text-xs"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isSaving}
                onClick={() => handleQuickSaveMetaName(quickEditId)}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl text-xs uppercase flex items-center gap-1.5 disabled:opacity-50"
              >
                {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Salvar Nome Meta
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Templates List Container */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        {/* Header & Controls */}
        <div className="p-4 sm:p-6 border-b border-slate-100 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <h3 className="text-lg font-black text-slate-800 tracking-tight">Modelos de Mensagem Cadastrados</h3>
            <p className="text-xs text-slate-400">Gerencie modelos de notificações automáticas por WhatsApp.</p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
            {/* Search Input */}
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar modelo ou ação..."
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Restore / Load Defaults */}
            <button
              onClick={async () => {
                if (!window.confirm('Deseja recarregar o conjunto padrão de modelos recomendados com os nomes Meta oficiais?')) return;
                setIsSaving(true);
                try {
                  const defaultTpls: GlobalWhatsAppTemplate[] = [
                    {
                      id: `global_tpl_lab_delivered`,
                      action: 'LAB_DELIVERED',
                      name: 'Laboratório: Trabalho Entregue ao Dentista',
                      body: 'Olá Dr(a) {{dentist_name}}, confirmamos que os seguintes trabalhos foram entregues com sucesso:\n\n{{jobs_list}}\n\nQualquer dúvida estamos à disposição!',
                      metaTemplateName: 'lab_delivered',
                      language: 'pt_BR',
                      active: true
                    },
                    {
                      id: `global_tpl_lab_dispatch`,
                      action: 'LAB_DISPATCH',
                      name: 'Laboratório: Trabalho em Rota de Entrega',
                      body: 'Olá Dr(a) {{dentist_name}}, os seguintes trabalhos do laboratório acabaram de sair para entrega com o entregador:\n\n{{jobs_list}}\n\nAcompanhe o recebimento em seu consultório!',
                      metaTemplateName: 'lab_dispatch',
                      language: 'pt_BR',
                      active: true
                    },
                    {
                      id: `global_tpl_clinic_app`,
                      action: 'CLINIC_APPOINTMENT',
                      name: 'Clínica: Lembrete e Confirmação de Consulta',
                      body: 'Olá {{patient_name}}, sua consulta está agendada para o dia {{date}} às {{time}}.\n\nPor favor, responda:\n1️⃣ para CONFIRMAR sua presença\n2️⃣ para CANCELAR ou solicitar reagendamento.',
                      metaTemplateName: 'clinic_appointment',
                      language: 'pt_BR',
                      active: true
                    },
                    {
                      id: `global_tpl_clinic_conf`,
                      action: 'CLINIC_APPOINTMENT_CONFIRMED',
                      name: 'Clínica: Confirmação Registrada',
                      body: 'Olá {{patient_name}}, recebemos sua confirmação! Sua consulta para o dia {{date}} às {{time}} está confirmada. Te esperamos!',
                      metaTemplateName: 'clinic_appointment_confirmed',
                      language: 'pt_BR',
                      active: true
                    },
                    {
                      id: `global_tpl_clinic_canc`,
                      action: 'CLINIC_APPOINTMENT_CANCELED',
                      name: 'Clínica: Cancelamento / Reagendamento Solicitado',
                      body: 'Olá {{patient_name}}, informamos que sua consulta do dia {{date}} às {{time}} foi cancelada. Nossa equipe entrará em contato para reagendamento.',
                      metaTemplateName: 'clinic_appointment_canceled',
                      language: 'pt_BR',
                      active: true
                    },
                    {
                      id: `global_tpl_supplier_upd`,
                      action: 'SUPPLIER_UPDATE',
                      name: 'Fornecedor: Status de Pedido / Entrega',
                      body: 'Olá, informamos que o status do seu pedido #{{order_id}} foi atualizado para: *{{status}}*.\n\nAcompanhe o progresso diretamente em nosso portal!',
                      metaTemplateName: 'supplier_update',
                      language: 'pt_BR',
                      active: true
                    }
                  ];

                  const existingIds = new Set(templatesList.map(t => t.action));
                  const newEntries = defaultTpls.filter(t => !existingIds.has(t.action));
                  const merged = [...templatesList, ...newEntries];

                  await updateGlobalSettings({ globalWhatsappTemplates: merged });
                  setMessage({ type: 'success', text: 'Modelos padrão sincronizados com sucesso!' });
                } catch (err) {
                  console.error(err);
                  setMessage({ type: 'error', text: 'Erro ao carregar modelos padrão.' });
                } finally {
                  setIsSaving(false);
                }
              }}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5"
              title="Carrega modelos prontos com nomes padronizados"
            >
              <Sparkles size={14} className="text-amber-500" />
              Carregar Padrões
            </button>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="px-4 sm:px-6 py-3 bg-slate-50/60 border-b border-slate-100 flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-1 flex items-center gap-1">
            <Filter size={12} /> Filtrar:
          </span>
          {[
            { id: 'ALL', label: `Todos (${templatesList.length})` },
            { id: 'LAB', label: 'Laboratório' },
            { id: 'CLINIC', label: 'Clínica' },
            { id: 'SUPPLIER', label: 'Fornecedor' },
            { id: 'ACTIVE', label: 'Ativos' },
            { id: 'INACTIVE', label: 'Inativos' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedCategory(tab.id as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                selectedCategory === tab.id
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-200'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/60'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Template Cards Grid */}
        <div className="p-4 sm:p-6">
          <div className="grid grid-cols-1 gap-4">
            {filteredTemplates.map((tpl) => {
              const config = actionsConfig[tpl.action];
              const systemName = config?.system || (tpl.action.startsWith('LAB') ? 'LAB' : tpl.action.startsWith('CLINIC') ? 'CLINIC' : 'GERAL');
              const isCopied = copiedId === tpl.id;

              return (
                <div 
                  key={tpl.id} 
                  className={`border rounded-3xl p-5 sm:p-6 transition-all ${
                    tpl.active 
                      ? 'bg-white border-slate-200/80 hover:border-blue-300 hover:shadow-md' 
                      : 'bg-slate-50/70 border-slate-200 opacity-75'
                  }`}
                >
                  <div className="flex flex-col lg:flex-row justify-between items-start gap-4">
                    {/* Main Info */}
                    <div className="space-y-3.5 flex-1 min-w-0">
                      {/* Top Header */}
                      <div className="flex items-center flex-wrap gap-2">
                        <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg ${
                          systemName === 'LAB' 
                            ? 'bg-purple-100 text-purple-700' 
                            : systemName === 'CLINIC' 
                            ? 'bg-emerald-100 text-emerald-700' 
                            : 'bg-blue-100 text-blue-700'
                        }`}>
                          {systemName}
                        </span>

                        <h4 className="font-black text-slate-900 text-base sm:text-lg tracking-tight">
                          {tpl.name}
                        </h4>

                        {/* Status Toggle Badge */}
                        <button
                          onClick={() => handleToggleActive(tpl.id, tpl.active)}
                          className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-lg border transition-colors flex items-center gap-1 ${
                            tpl.active 
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100' 
                              : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
                          }`}
                          title="Clique para alternar o status do disparo"
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${tpl.active ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                          {tpl.active ? 'Ativo (Disparando)' : 'Pausado'}
                        </button>
                      </div>

                      {/* Meta Template Slug Pill */}
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <div className="flex items-center gap-1.5 bg-slate-100/80 px-3 py-1.5 rounded-xl border border-slate-200">
                          <Smartphone size={13} className="text-blue-600 shrink-0" />
                          <span className="font-bold text-slate-500 text-[11px]">Nome no Meta:</span>
                          {tpl.metaTemplateName ? (
                            <span className="font-mono font-black text-blue-700 bg-white px-2 py-0.5 rounded-md border border-blue-200 text-xs">
                              {tpl.metaTemplateName}
                            </span>
                          ) : (
                            <span className="text-rose-600 font-bold text-[11px] bg-rose-50 px-2 py-0.5 rounded border border-rose-100 flex items-center gap-1">
                              <AlertCircle size={11} /> Não configurado (usará nome padrão)
                            </span>
                          )}
                          <button
                            onClick={() => {
                              setQuickEditId(tpl.id);
                              setQuickMetaName(tpl.metaTemplateName || '');
                            }}
                            className="p-1 hover:bg-slate-200 text-slate-500 hover:text-blue-600 rounded transition-colors"
                            title="Editar apenas o nome Meta deste modelo"
                          >
                            <Edit2 size={12} />
                          </button>
                          {tpl.metaTemplateName && (
                            <button
                              onClick={() => handleCopy(tpl.metaTemplateName!, tpl.id)}
                              className="p-1 hover:bg-slate-200 text-slate-500 hover:text-blue-600 rounded transition-colors"
                              title="Copiar nome do modelo Meta"
                            >
                              {isCopied ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                            </button>
                          )}
                        </div>

                        <div className="bg-slate-100/80 px-2.5 py-1.5 rounded-xl border border-slate-200 text-[11px] font-bold text-slate-600">
                          Gatilho: <span className="font-mono font-bold text-slate-800">{tpl.action}</span>
                        </div>

                        <div className="bg-slate-100/80 px-2.5 py-1.5 rounded-xl border border-slate-200 text-[11px] font-bold text-slate-600">
                          Idioma: <span className="font-mono font-bold text-slate-800">{tpl.language || 'pt_BR'}</span>
                        </div>
                      </div>

                      {/* Message Preview Box */}
                      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 text-xs sm:text-sm text-slate-700 font-mono whitespace-pre-wrap leading-relaxed shadow-inner">
                        {tpl.body}
                      </div>

                      {/* Variables Footer */}
                      <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500 font-medium">
                        <span className="font-bold text-slate-400 uppercase text-[10px]">Variáveis:</span>
                        {(config?.vars || ['variaveis']).map(v => (
                          <span key={v} className="bg-white px-2 py-0.5 rounded-md border border-slate-200 text-[10px] font-mono font-bold text-slate-600">
                            {`{{${v}}}`}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Action Buttons Column */}
                    <div className="flex lg:flex-col items-center justify-end gap-2 w-full lg:w-44 shrink-0 lg:border-l lg:border-slate-100 lg:pl-5 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                      <button
                        onClick={() => handleOpenEdit(tpl)}
                        className="flex-1 lg:w-full py-2.5 px-3 bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 border border-blue-200/60 shadow-xs"
                      >
                        <Edit2 size={13} /> EDITAR
                      </button>

                      <button
                        onClick={() => handleDuplicate(tpl)}
                        className="flex-1 lg:w-full py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                        title="Criar cópia deste modelo"
                      >
                        <Copy size={13} /> DUPLICAR
                      </button>

                      <button
                        onClick={() => {
                          if (testerRef.current) {
                            testerRef.current.scrollIntoView({ behavior: 'smooth' });
                          }
                        }}
                        className="flex-1 lg:w-full py-2 px-3 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 border border-purple-200/50"
                        title="Testar disparo via YCloud"
                      >
                        <Smartphone size={13} /> TESTAR
                      </button>

                      <button
                        onClick={() => handleDelete(tpl.id)}
                        className="py-2 px-3 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 lg:w-full"
                        title="Excluir modelo"
                      >
                        <Trash2 size={13} /> EXCLUIR
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            {filteredTemplates.length === 0 && (
              <div className="text-center py-16 text-slate-400 italic flex flex-col items-center justify-center gap-3 bg-slate-50/50 rounded-3xl border border-dashed border-slate-200">
                <MessageSquare size={48} className="opacity-20 text-slate-600" />
                <div>
                  <p className="font-bold text-slate-600 not-italic text-base">Nenhum modelo de mensagem encontrado.</p>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
                    {searchQuery ? 'Tente mudar o termo de busca ou o filtro de categoria.' : 'Clique em "Novo Modelo Global" ou "Carregar Padrões" para começar.'}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Testador Integrado */}
      <div ref={testerRef}>
        <YcloudTester />
      </div>
    </div>
  );
};
