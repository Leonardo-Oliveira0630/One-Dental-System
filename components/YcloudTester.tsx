import React, { useState, useEffect } from 'react';
import { Send, Loader2, Bug, History, Smartphone, MessageSquare, AlertCircle, Info, RefreshCw } from 'lucide-react';
import { db, functions } from '../services/firebaseConfig';
import { useApp } from '../context/AppContext';
import * as firestorePkg from 'firebase/firestore';
import * as functionsPkg from 'firebase/functions';

const { collection, query, orderBy, limit, getDocs } = firestorePkg as any;
const { httpsCallable } = functionsPkg as any;

export const YcloudTester = () => {
  const { globalSettings } = useApp();
  const [testMode, setTestMode] = useState<'TEMPLATE' | 'TEXT'>('TEMPLATE');
  const [phone, setPhone] = useState('');
  
  // Template Mode State
  const [templateName, setTemplateName] = useState('lab_trabalho_entregue');
  const [languageCode, setLanguageCode] = useState('pt_BR');
  const [param1, setParam1] = useState('Dr. Leonardo');
  const [param2, setParam2] = useState('- Paciente Teste (OS: 123456)');
  
  // Text Mode State
  const [message, setMessage] = useState('Olá! Mensagem de teste enviada pelo Labprox.');
  
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  
  const [logs, setLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  const fetchLogs = async () => {
    setLoadingLogs(true);
    try {
      const q = query(
        collection(db, 'message_logs'),
        orderBy('createdAt', 'desc'),
        limit(15)
      );
      const snap = await getDocs(q);
      const fetchedLogs = snap.docs.map((doc: any) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date()
      }));
      setLogs(fetchedLogs);
    } catch (err) {
      console.error('Erro ao buscar logs:', err);
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const handleTest = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const sendYcloudWhatsApp = httpsCallable(functions, 'sendYcloudWhatsApp');
      let payload: any = { to: phone };

      if (testMode === 'TEMPLATE') {
        const bodyParameters: any[] = [];
        if (param1.trim()) bodyParameters.push({ type: 'text', text: param1.trim() });
        if (param2.trim()) bodyParameters.push({ type: 'text', text: param2.trim() });

        const components: any[] = [];
        if (bodyParameters.length > 0) {
          components.push({
            type: 'body',
            parameters: bodyParameters
          });
        }

        payload.body = `[Envio de Template: ${templateName.trim()}]`;
        payload.template = {
          name: templateName.trim(),
          language: {
            code: languageCode.trim() || 'pt_BR'
          },
          components: components.length > 0 ? components : undefined
        };
      } else {
        payload.body = message;
      }

      const res = await sendYcloudWhatsApp(payload);
      setResult(res.data);
      setTimeout(fetchLogs, 1500);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Erro desconhecido');
      setTimeout(fetchLogs, 1000);
    } finally {
      setLoading(false);
    }
  };

  const configuredTemplates = globalSettings?.globalWhatsappTemplates || [];

  return (
    <div className="space-y-6 mt-8">
      <div className="bg-white p-5 sm:p-7 rounded-3xl border border-slate-200 shadow-sm">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-100 text-purple-600 rounded-2xl">
              <Bug size={24} />
            </div>
            <div>
              <h3 className="font-black text-slate-800 text-lg">Testador de Disparos WhatsApp (YCloud / Meta)</h3>
              <p className="text-xs text-slate-500">Faça envios manuais para diagnosticar e validar modelos de template da Meta.</p>
            </div>
          </div>

          <div className="flex bg-slate-100 p-1 rounded-2xl">
            <button
              type="button"
              onClick={() => setTestMode('TEMPLATE')}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                testMode === 'TEMPLATE'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Smartphone size={14} /> Modelo Meta (Template)
            </button>
            <button
              type="button"
              onClick={() => setTestMode('TEXT')}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                testMode === 'TEXT'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <MessageSquare size={14} /> Texto Livre (24h)
            </button>
          </div>
        </div>

        <form onSubmit={handleTest} className="space-y-4">
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1.5">
              Telefone de Destino (com DDD)
            </label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Ex: 27996566725 ou 5527996566725"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white"
              required
            />
          </div>

          {testMode === 'TEMPLATE' ? (
            <div className="p-4 bg-purple-50/50 rounded-2xl border border-purple-100 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1">
                    Nome Exato do Modelo na Meta / YCloud
                  </label>
                  <input
                    type="text"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    placeholder="Ex: lab_trabalho_entregue"
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl font-mono text-sm font-bold text-purple-900 outline-none focus:ring-2 focus:ring-purple-500"
                    required
                  />
                  {configuredTemplates.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      <span className="text-[10px] text-slate-400 font-bold uppercase">Preencher com:</span>
                      {configuredTemplates.filter(t => t.metaTemplateName).map(t => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => {
                            setTemplateName(t.metaTemplateName!);
                            if (t.language) setLanguageCode(t.language);
                          }}
                          className="text-[10px] font-mono font-bold bg-white text-purple-700 px-2 py-0.5 rounded border border-purple-200 hover:bg-purple-100"
                        >
                          {t.metaTemplateName}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1">
                    Código de Idioma
                  </label>
                  <input
                    type="text"
                    value={languageCode}
                    onChange={(e) => setLanguageCode(e.target.value)}
                    placeholder="Ex: pt_BR"
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl font-mono text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-purple-500"
                    required
                  />
                  <p className="text-[11px] text-slate-500 mt-1">Geralmente <code className="font-bold">pt_BR</code> para português brasileiro.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-purple-100">
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1">
                    Variável 1 (ex: Nome do Dentista / Paciente)
                  </label>
                  <input
                    type="text"
                    value={param1}
                    onChange={(e) => setParam1(e.target.value)}
                    placeholder="Ex: Dr. Leonardo"
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1">
                    Variável 2 (ex: Lista de Trabalhos / Detalhes)
                  </label>
                  <input
                    type="text"
                    value={param2}
                    onChange={(e) => setParam2(e.target.value)}
                    placeholder="Ex: - Paciente Teste (OS: 123456)"
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-black uppercase tracking-wider text-slate-700">
                  Mensagem de Texto Livre
                </label>
                <span className="text-[11px] font-bold text-amber-600 flex items-center gap-1">
                  <AlertCircle size={12} /> Só funciona se o cliente tiver falado com você nas últimas 24h
                </span>
              </div>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white text-sm min-h-[100px]"
                required
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-purple-600 hover:bg-purple-700 text-white font-black uppercase tracking-wider text-xs sm:text-sm rounded-2xl flex justify-center items-center gap-2 transition-all shadow-lg shadow-purple-200 disabled:opacity-50 active:scale-95"
          >
            {loading ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
            {loading ? 'Disparando...' : 'Testar Envio via YCloud'}
          </button>
        </form>

        {result && (
          <div className="mt-6 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl animate-in fade-in">
            <h4 className="font-black text-emerald-800 text-sm mb-1 flex items-center gap-1.5">
              Envio Concluído com Sucesso pela Meta!
            </h4>
            <pre className="text-xs font-mono text-emerald-700 overflow-x-auto bg-white p-3 rounded-xl border border-emerald-100 mt-2">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}

        {error && (
          <div className="mt-6 p-4 bg-rose-50 border border-rose-200 rounded-2xl animate-in fade-in">
            <h4 className="font-black text-rose-800 text-sm mb-1 flex items-center gap-1.5">
              <AlertCircle size={16} /> Falha no Envio retornado pela Meta/YCloud
            </h4>
            <pre className="text-xs font-mono text-rose-700 whitespace-pre-wrap bg-white p-3 rounded-xl border border-rose-100 mt-2">
              {error}
            </pre>
          </div>
        )}
      </div>

      {/* Logs Card */}
      <div className="bg-white p-5 sm:p-7 rounded-3xl border border-slate-200 shadow-sm">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 mb-6 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-slate-100 text-slate-700 rounded-2xl">
              <History size={22} />
            </div>
            <div>
              <h3 className="font-black text-slate-800 text-lg">Histórico de Disparos Recentes</h3>
              <p className="text-xs text-slate-400">Mensagens processadas pelo YCloud (coleção: <code className="font-bold">message_logs</code>)</p>
            </div>
          </div>
          <button 
            onClick={fetchLogs} 
            disabled={loadingLogs}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs uppercase tracking-wider rounded-xl transition-all flex items-center gap-1.5 self-start sm:self-auto"
          >
            <RefreshCw size={13} className={loadingLogs ? 'animate-spin' : ''} />
            {loadingLogs ? 'Atualizando...' : 'Atualizar Logs'}
          </button>
        </div>

        {logs.length === 0 ? (
          <p className="text-center text-slate-400 py-10 italic text-sm">Nenhum log registrado recentemente.</p>
        ) : (
          <div className="space-y-3">
            {logs.map((log) => (
              <div key={log.id} className="p-4 bg-slate-50/80 border border-slate-200/70 rounded-2xl hover:bg-slate-50 transition-colors">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                      log.status === 'SENT' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                    }`}>
                      {log.status === 'SENT' ? 'ENVIADO' : 'FALHA'}
                    </span>
                    <span className="text-[11px] font-mono text-slate-400">ID: {log.id}</span>
                  </div>
                  <span className="text-[11px] font-medium text-slate-400">
                    {log.createdAt instanceof Date ? log.createdAt.toLocaleString('pt-BR') : 'Sem data'}
                  </span>
                </div>
                <div className="text-xs text-slate-800 font-bold mb-1.5 flex items-center gap-2">
                  Destinatário: <span className="font-mono text-purple-700 bg-white px-2 py-0.5 rounded border border-purple-200 text-[11px]">{log.recipient}</span>
                  {log.templateId && <span className="text-slate-400 font-normal">| Modelo: <code className="font-bold text-slate-600">{log.templateId}</code></span>}
                </div>
                <div className="text-xs text-slate-700 bg-white p-3 rounded-xl border border-slate-200 font-mono overflow-x-auto whitespace-pre-wrap leading-relaxed">
                  {log.message}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
