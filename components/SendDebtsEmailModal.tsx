import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, Mail, Send, CheckCircle2, AlertCircle, Loader2, Eye, 
  Settings, Key, ChevronDown, ChevronUp, Check, AlertTriangle, 
  Search, RefreshCw, FileText, Download, HelpCircle, ShieldCheck, UserCheck
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { 
  ClientDebtItem, 
  generateClientStatementPDF, 
  buildStatementEmailHtml, 
  sendBrevoEmail, 
  testBrevoConnection 
} from '../services/brevoService';
import { Job, DentistPayment } from '../types';

interface SendDebtsEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportDebts: ClientDebtItem[];
  reportStartDate: string;
  reportEndDate: string;
  allJobs: Job[];
  dentistPayments: DentistPayment[];
  initialSelectedClientId?: string;
  onEmailStatusUpdate?: (results: Array<{ clientId: string; status: 'SUCCESS' | 'ERROR'; message?: string }>) => void;
}

export const SendDebtsEmailModal: React.FC<SendDebtsEmailModalProps> = ({
  isOpen,
  onClose,
  reportDebts,
  reportStartDate,
  reportEndDate,
  allJobs,
  dentistPayments,
  initialSelectedClientId,
  onEmailStatusUpdate
}) => {
  const { currentOrg, updateOrganization, updateManualDentist, manualDentists } = useApp();

  // Brevo Config State
  const [senderEmail, setSenderEmail] = useState(currentOrg?.brevoSenderEmail || 'contato@labprox.com.br');
  const [senderName, setSenderName] = useState(currentOrg?.brevoSenderName || 'Labprox Laboratório');
  const [showConfig, setShowConfig] = useState(false);
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [testStatus, setTestStatus] = useState<'IDLE' | 'TESTING' | 'VALID' | 'INVALID'>('IDLE');
  const [testDetails, setTestDetails] = useState<string>('');

  // Email Content Customization
  const sDateFormatted = reportStartDate ? new Date(`${reportStartDate}T00:00:00`).toLocaleDateString('pt-BR') : '';
  const eDateFormatted = reportEndDate ? new Date(`${reportEndDate}T23:59:59`).toLocaleDateString('pt-BR') : '';
  const defaultSubject = `Extrato Financeiro - ${currentOrg?.name || 'Laboratório'} (${sDateFormatted} a ${eDateFormatted})`;

  const [emailSubject, setEmailSubject] = useState(defaultSubject);
  const [customNotes, setCustomNotes] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Selected Clients State
  const [selectedClientIds, setSelectedClientIds] = useState<string[]>(() => {
    if (initialSelectedClientId) return [initialSelectedClientId];
    return reportDebts.map(d => d.id);
  });

  // Client Emails Map (allows inline editing/override before sending)
  const [clientEmails, setClientEmails] = useState<Record<string, string>>({});
  const [editingEmailId, setEditingEmailId] = useState<string | null>(null);
  const [tempEmailVal, setTempEmailVal] = useState('');

  // Sending Process State
  const [isSending, setIsSending] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentClientName, setCurrentClientName] = useState('');
  const [sendResults, setSendResults] = useState<Array<{
    clientId: string;
    clientName: string;
    email: string;
    status: 'SUCCESS' | 'ERROR';
    message?: string;
  }>>([]);

  // Preview state
  const [previewingClientId, setPreviewingClientId] = useState<string | null>(null);

  // Initialize emails from reportDebts
  useEffect(() => {
    const map: Record<string, string> = {};
    reportDebts.forEach(d => {
      const email = d.email || d.dentistObj?.email || '';
      map[d.id] = email;
    });
    setClientEmails(map);

    if (initialSelectedClientId) {
      setSelectedClientIds([initialSelectedClientId]);
    } else {
      setSelectedClientIds(reportDebts.map(d => d.id));
    }
  }, [reportDebts, initialSelectedClientId]);

  // Update subject when dates change
  useEffect(() => {
    setEmailSubject(`Extrato Financeiro - ${currentOrg?.name || 'Laboratório'} (${sDateFormatted} a ${eDateFormatted})`);
  }, [reportStartDate, reportEndDate, currentOrg?.name]);

  const handleToggleSelectAll = () => {
    if (selectedClientIds.length === reportDebts.length) {
      setSelectedClientIds([]);
    } else {
      setSelectedClientIds(reportDebts.map(d => d.id));
    }
  };

  const handleToggleClient = (id: string) => {
    if (selectedClientIds.includes(id)) {
      setSelectedClientIds(selectedClientIds.filter(i => i !== id));
    } else {
      setSelectedClientIds([...selectedClientIds, id]);
    }
  };

  const handleSaveBrevoConfig = async () => {
    if (!currentOrg?.id) return;
    setIsSavingConfig(true);
    try {
      await updateOrganization(currentOrg.id, {
        brevoSenderEmail: senderEmail.trim().toLowerCase(),
        brevoSenderName: senderName.trim()
      });
      alert('Configurações de remetente do Brevo salvas com sucesso!');
      setShowConfig(false);
    } catch (err: any) {
      console.error(err);
      alert('Erro ao salvar configurações do Brevo: ' + (err.message || err));
    } finally {
      setIsSavingConfig(false);
    }
  };

  const handleTestConnection = async () => {
    setTestStatus('TESTING');
    setTestDetails('');
    const res = await testBrevoConnection(currentOrg?.id);
    if (res.valid) {
      setTestStatus('VALID');
      setTestDetails(res.email ? `Conectado: ${res.email}` : 'Conexão validada com sucesso.');
    } else {
      setTestStatus('INVALID');
      setTestDetails(res.message || 'Falha ao autenticar.');
    }
  };

  const handleSaveEmailForClient = async (clientId: string) => {
    const emailToSave = tempEmailVal.trim().toLowerCase();
    setClientEmails(prev => ({ ...prev, [clientId]: emailToSave }));
    setEditingEmailId(null);

    // Salva no banco de dados se for cliente manual
    try {
      const manual = manualDentists.find(m => m.id === clientId);
      if (manual && currentOrg?.id) {
        await updateManualDentist(clientId, { email: emailToSave });
      }
    } catch (e) {
      console.warn("Erro ao atualizar e-mail no cadastro do dentista:", e);
    }
  };

  const handlePreviewPDF = async (clientItem: ClientDebtItem) => {
    if (!currentOrg) return;
    setPreviewingClientId(clientItem.id);
    try {
      const { doc } = await generateClientStatementPDF({
        client: clientItem.dentistObj || clientItem,
        currentOrg,
        jobs: allJobs,
        dentistPayments,
        startDateStr: reportStartDate,
        endDateStr: reportEndDate
      });
      doc.output('dataurlnewwindow');
    } catch (err: any) {
      console.error(err);
      alert('Erro ao gerar prévia do PDF: ' + (err.message || err));
    } finally {
      setPreviewingClientId(null);
    }
  };

  const filteredDebts = useMemo(() => {
    if (!searchTerm.trim()) return reportDebts;
    const s = searchTerm.toLowerCase();
    return reportDebts.filter(d => 
      (d.name && d.name.toLowerCase().includes(s)) ||
      (d.clinicName && d.clinicName.toLowerCase().includes(s)) ||
      (clientEmails[d.id] && clientEmails[d.id].toLowerCase().includes(s))
    );
  }, [reportDebts, searchTerm, clientEmails]);

  const selectedWithValidEmailCount = useMemo(() => {
    return selectedClientIds.filter(id => {
      const email = clientEmails[id];
      return email && email.includes('@') && email.includes('.');
    }).length;
  }, [selectedClientIds, clientEmails]);

  const handleStartSending = async () => {
    if (!senderEmail.trim()) {
      setShowConfig(true);
      alert('Por favor, informe o e-mail de remetente configurado no seu Brevo.');
      return;
    }

    if (!currentOrg) {
      alert('Dados da organização não carregados. Por favor, aguarde ou recarregue a página.');
      return;
    }

    if (selectedClientIds.length === 0) {
      alert('Selecione pelo menos um cliente para enviar o extrato.');
      return;
    }

    const clientsToSend = reportDebts.filter(d => selectedClientIds.includes(d.id));
    const clientsMissingEmail = clientsToSend.filter(d => !clientEmails[d.id] || !clientEmails[d.id].includes('@'));

    if (clientsMissingEmail.length === clientsToSend.length) {
      alert('Nenhum dos clientes selecionados possui um e-mail válido cadastrado. Insira os e-mails na lista antes de enviar.');
      return;
    }

    if (clientsMissingEmail.length > 0) {
      const confirmProceed = window.confirm(
        `${clientsMissingEmail.length} cliente(s) selecionado(s) estão sem e-mail cadastrado e não receberão o extrato. Deseja prosseguir com os ${clientsToSend.length - clientsMissingEmail.length} clientes válidos?`
      );
      if (!confirmProceed) return;
    }

    setIsSending(true);
    setSendResults([]);
    setCurrentIndex(0);

    const validClients = clientsToSend.filter(d => clientEmails[d.id] && clientEmails[d.id].includes('@'));
    const accumulatedResults: Array<{
      clientId: string;
      clientName: string;
      email: string;
      status: 'SUCCESS' | 'ERROR';
      message?: string;
    }> = [];

    for (let i = 0; i < validClients.length; i++) {
      const clientItem = validClients[i];
      const targetEmail = clientEmails[clientItem.id].trim();
      setCurrentIndex(i + 1);
      setCurrentClientName(clientItem.name);

      try {
        // 1. Gerar PDF específico com base64
        const { base64, filename, totals } = await generateClientStatementPDF({
          client: clientItem.dentistObj || clientItem,
          currentOrg: currentOrg!,
          jobs: allJobs,
          dentistPayments,
          startDateStr: reportStartDate,
          endDateStr: reportEndDate
        });

        // 2. Gerar HTML do E-mail
        const htmlContent = buildStatementEmailHtml({
          clientName: clientItem.name,
          clinicName: clientItem.clinicName,
          labName: currentOrg?.name || 'Labprox Laboratório',
          labEmail: senderEmail,
          labPhone: currentOrg?.phone || currentOrg?.whatsapp,
          pixKey: currentOrg?.financialSettings?.pixKey,
          startDateStr: sDateFormatted,
          endDateStr: eDateFormatted,
          previousBalance: totals.previousBalance,
          totalServices: totals.totalServices,
          totalPayments: totals.totalPayments,
          currentBalance: totals.currentBalance,
          customMessage: customNotes.trim() || undefined
        });

        // 3. Enviar via Brevo (Google Cloud Backend)
        await sendBrevoEmail({
          sender: {
            name: senderName.trim() || currentOrg?.name || 'Labprox',
            email: senderEmail.trim().toLowerCase()
          },
          to: [
            {
              name: clientItem.name,
              email: targetEmail
            }
          ],
          subject: emailSubject.trim() || defaultSubject,
          htmlContent,
          attachment: [
            {
              name: filename,
              content: base64
            }
          ],
          orgId: currentOrg?.id
        });

        const resItem = {
          clientId: clientItem.id,
          clientName: clientItem.name,
          email: targetEmail,
          status: 'SUCCESS' as const
        };
        accumulatedResults.push(resItem);
        setSendResults(prev => [...prev, resItem]);
      } catch (err: any) {
        console.error(`Erro ao enviar para ${clientItem.name}:`, err);
        const errItem = {
          clientId: clientItem.id,
          clientName: clientItem.name,
          email: targetEmail,
          status: 'ERROR' as const,
          message: err.message || 'Erro no envio'
        };
        accumulatedResults.push(errItem);
        setSendResults(prev => [...prev, errItem]);
      }

      // Pequeno delay entre requisições para evitar rate limit
      await new Promise(r => setTimeout(r, 400));
    }

    setIsSending(false);
    if (onEmailStatusUpdate) {
      onEmailStatusUpdate(accumulatedResults);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl border border-slate-100 flex flex-col max-h-[92vh] overflow-hidden my-auto">
        
        {/* MODAL HEADER */}
        <div className="px-6 py-5 bg-gradient-to-r from-slate-900 via-slate-800 to-blue-950 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-400">
              <Mail size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black tracking-tight">Enviar Extratos por E-mail</h3>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-500/30 text-blue-300 border border-blue-400/30">
                  Brevo API
                </span>
              </div>
              <p className="text-xs text-slate-300 font-medium">
                Período: <strong className="text-white">{sDateFormatted}</strong> até <strong className="text-white">{eDateFormatted}</strong> • PDF do extrato individual anexado
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            disabled={isSending}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors disabled:opacity-50"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-5">
          
          {/* BREVO CONFIG ACCORDION */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden transition-all">
            <div 
              onClick={() => setShowConfig(!showConfig)}
              className="px-5 py-3.5 flex items-center justify-between cursor-pointer hover:bg-slate-100/80 transition-colors select-none"
            >
              <div className="flex items-center gap-2.5">
                <ShieldCheck size={18} className="text-blue-600" />
                <span className="text-xs font-black text-slate-800 uppercase tracking-wider">
                  Remetente &amp; Conexão Brevo (Google Cloud)
                </span>
                {testStatus === 'VALID' ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-700">
                    <CheckCircle2 size={12} /> Conectado
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-100 text-blue-700">
                    <ShieldCheck size={12} /> Protegido no Servidor
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-slate-500">
                  {showConfig ? 'Ocultar Detalhes' : 'Ver Remetente / Testar'}
                </span>
                {showConfig ? <ChevronUp size={16} className="text-slate-400"/> : <ChevronDown size={16} className="text-slate-400"/>}
              </div>
            </div>

            {showConfig && (
              <div className="px-5 pb-5 pt-2 border-t border-slate-200/80 space-y-4 bg-white/60">
                <div className="bg-emerald-50/80 border border-emerald-100 p-3.5 rounded-xl text-xs text-emerald-900 space-y-1">
                  <p className="font-bold flex items-center gap-1.5">
                    <ShieldCheck size={15} className="text-emerald-600 shrink-0" />
                    Armazenamento Seguro no Google Cloud:
                  </p>
                  <p className="text-[11px] text-emerald-700 leading-relaxed">
                    A chave de API da Brevo reside de forma segura no backend (Cloud Functions / Secret Manager), garantindo que credenciais confidenciais nunca fiquem expostas no navegador.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-slate-100/70 border border-slate-200 rounded-xl">
                    <div>
                      <span className="text-xs font-bold text-slate-700 block">Status da Conexão Brevo no Cloud Functions</span>
                      <span className="text-[11px] text-slate-500">
                        {testDetails || 'Clique ao lado para testar a comunicação com a API do Brevo'}
                      </span>
                    </div>
                    <button 
                      type="button"
                      onClick={handleTestConnection}
                      disabled={testStatus === 'TESTING'}
                      className="px-3.5 py-1.5 text-xs font-black uppercase rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5 shrink-0"
                    >
                      {testStatus === 'TESTING' ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
                      {testStatus === 'TESTING' ? 'Testando...' : 'Testar Conexão'}
                    </button>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">
                      E-mail do Remetente (Brevo Sender) *
                    </label>
                    <input 
                      type="email"
                      value={senderEmail}
                      onChange={e => setSenderEmail(e.target.value)}
                      placeholder="financeiro@seulab.com.br"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">
                      Nome de Exibição do Remetente
                    </label>
                    <input 
                      type="text"
                      value={senderName}
                      onChange={e => setSenderName(e.target.value)}
                      placeholder="Ex: Laboratório Sorriso Dental"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="flex items-end">
                    <button 
                      type="button"
                      onClick={handleSaveBrevoConfig}
                      disabled={isSavingConfig}
                      className="w-full py-2 bg-slate-900 text-white hover:bg-slate-800 rounded-xl text-xs font-black uppercase transition-all shadow-sm flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      {isSavingConfig ? <Loader2 size={14} className="animate-spin"/> : <Check size={14}/>}
                      Salvar Remetente
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* EMAIL CUSTOMIZATION SECTION */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
            <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Mail size={16} className="text-blue-600" /> Mensagem e Assunto do E-mail
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="md:col-span-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Assunto do E-mail</label>
                <input 
                  type="text"
                  value={emailSubject}
                  onChange={e => setEmailSubject(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Chave PIX de Cobrança</label>
                <input 
                  type="text"
                  disabled
                  value={currentOrg?.financialSettings?.pixKey || 'Não cadastrada (Configurações)'}
                  className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">
                Observação / Mensagem Adicional no Corpo do E-mail (Opcional)
              </label>
              <textarea 
                value={customNotes}
                onChange={e => setCustomNotes(e.target.value)}
                placeholder="Ex: Segue em anexo o fechamento do período. Gentileza conferir e efetuar o pagamento até o dia 10."
                rows={2}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>
          </div>

          {/* CLIENTS SELECTION TABLE */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden space-y-0">
            <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input 
                    type="checkbox"
                    checked={selectedClientIds.length > 0 && selectedClientIds.length === reportDebts.length}
                    onChange={handleToggleSelectAll}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className="text-xs font-black text-slate-800 uppercase tracking-wider">
                    Selecionar Todos ({selectedClientIds.length}/{reportDebts.length})
                  </span>
                </label>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-100 text-blue-800">
                  {selectedWithValidEmailCount} com e-mail válido
                </span>
              </div>

              <div className="relative w-full sm:w-64">
                <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
                <input 
                  type="text"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  placeholder="Buscar na lista..."
                  className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* SENDING LIVE PROGRESS */}
            {isSending && (
              <div className="p-4 bg-blue-50 border-b border-blue-200 animate-in fade-in">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-black text-blue-900 flex items-center gap-2">
                    <Loader2 size={16} className="animate-spin text-blue-600" />
                    Enviando {currentIndex} de {selectedClientIds.length}: <strong className="text-blue-950">{currentClientName}</strong>
                  </span>
                  <span className="text-xs font-black text-blue-700 font-mono">
                    {Math.round((currentIndex / selectedClientIds.length) * 100)}%
                  </span>
                </div>
                <div className="w-full bg-blue-200 rounded-full h-2 overflow-hidden">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(currentIndex / selectedClientIds.length) * 100}%` }}
                  />
                </div>
              </div>
            )}

            {/* CLIENTS LIST */}
            <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
              {filteredDebts.length === 0 ? (
                <div className="p-8 text-center text-slate-400 font-bold text-xs">
                  Nenhum cliente encontrado.
                </div>
              ) : (
                filteredDebts.map(client => {
                  const isSelected = selectedClientIds.includes(client.id);
                  const currentEmail = clientEmails[client.id] || '';
                  const hasValidEmail = currentEmail && currentEmail.includes('@') && currentEmail.includes('.');
                  const isEditingEmail = editingEmailId === client.id;
                  const previewLoading = previewingClientId === client.id;

                  const clientResult = sendResults.find(r => r.clientId === client.id);

                  return (
                    <div 
                      key={client.id}
                      className={`p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-colors ${
                        isSelected ? 'bg-blue-50/30 hover:bg-blue-50/50' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <input 
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleClient(client.id)}
                          disabled={isSending}
                          className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-xs font-black text-slate-800 truncate">{client.name}</p>
                            {client.clinicName && (
                              <span className="text-[10px] font-bold text-slate-400 truncate">
                                ({client.clinicName})
                              </span>
                            )}
                          </div>

                          {/* Email Display / Edit Field */}
                          <div className="flex items-center gap-2 mt-0.5">
                            {isEditingEmail ? (
                              <div className="flex items-center gap-1.5">
                                <input 
                                  type="email"
                                  value={tempEmailVal}
                                  onChange={e => setTempEmailVal(e.target.value)}
                                  placeholder="Digite o e-mail..."
                                  autoFocus
                                  className="px-2 py-0.5 bg-white border border-blue-400 rounded-lg text-xs font-bold text-slate-800 outline-none w-48"
                                />
                                <button 
                                  onClick={() => handleSaveEmailForClient(client.id)}
                                  className="px-2 py-0.5 bg-blue-600 text-white rounded-lg text-[10px] font-bold uppercase hover:bg-blue-700"
                                >
                                  OK
                                </button>
                                <button 
                                  onClick={() => setEditingEmailId(null)}
                                  className="px-1.5 py-0.5 text-slate-400 hover:text-slate-600 text-[10px] font-bold"
                                >
                                  Cancelar
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5">
                                {hasValidEmail ? (
                                  <span className="text-[11px] font-bold text-slate-600 flex items-center gap-1">
                                    <Mail size={12} className="text-slate-400" /> {currentEmail}
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-black text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/80 flex items-center gap-1">
                                    <AlertTriangle size={11} /> Sem e-mail cadastrado
                                  </span>
                                )}
                                <button 
                                  onClick={() => {
                                    setEditingEmailId(client.id);
                                    setTempEmailVal(currentEmail);
                                  }}
                                  disabled={isSending}
                                  className="text-[10px] font-bold text-blue-600 hover:underline ml-1"
                                >
                                  {hasValidEmail ? 'Alterar' : '+ Inserir E-mail'}
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right side: Debt amount, status, and Preview action */}
                      <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                        <div className="text-right">
                          <span className="text-xs font-black text-rose-600 bg-rose-50 px-2.5 py-1 rounded-xl">
                            R$ {client.balanceUpToEndDate.toFixed(2)}
                          </span>
                        </div>

                        {/* Send Result Status */}
                        {clientResult && (
                          <div>
                            {clientResult.status === 'SUCCESS' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-black bg-emerald-100 text-emerald-800" title="Enviado com sucesso!">
                                <CheckCircle2 size={13} /> Enviado
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-black bg-rose-100 text-rose-800" title={clientResult.message}>
                                <AlertCircle size={13} /> Falha
                              </span>
                            )}
                          </div>
                        )}

                        {/* PDF Preview Button */}
                        <button 
                          type="button"
                          onClick={() => handlePreviewPDF(client)}
                          disabled={previewLoading || isSending}
                          className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[10px] font-black uppercase transition-colors flex items-center gap-1"
                          title="Visualizar PDF que será anexado ao e-mail"
                        >
                          {previewLoading ? <Loader2 size={12} className="animate-spin"/> : <Eye size={12} />}
                          PDF
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* SEND RESULTS SUMMARY (if completed) */}
          {sendResults.length > 0 && !isSending && (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2 animate-in fade-in">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <ShieldCheck size={16} className="text-emerald-600" /> Resultado dos Disparos
                </span>
                <span className="text-xs font-bold text-slate-600">
                  <strong className="text-emerald-600">{sendResults.filter(r => r.status === 'SUCCESS').length}</strong> enviados com sucesso • <strong className="text-rose-600">{sendResults.filter(r => r.status === 'ERROR').length}</strong> com erro
                </span>
              </div>
            </div>
          )}

        </div>

        {/* MODAL FOOTER */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-500 font-medium text-center sm:text-left">
            Total selecionados para envio: <strong className="text-slate-800">{selectedClientIds.length} clientes</strong> ({selectedWithValidEmailCount} com e-mail válido)
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button 
              type="button"
              onClick={onClose}
              disabled={isSending}
              className="flex-1 sm:flex-initial px-4 py-2.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs font-black uppercase transition-colors disabled:opacity-50"
            >
              Fechar
            </button>
            <button 
              type="button"
              onClick={handleStartSending}
              disabled={isSending || selectedClientIds.length === 0}
              className="flex-1 sm:flex-initial px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black uppercase transition-all shadow-md shadow-blue-500/25 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isSending ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send size={16} />
                  Disparar Extratos ({selectedWithValidEmailCount})
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
