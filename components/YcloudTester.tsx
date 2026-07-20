import React, { useState, useEffect } from 'react';
import { Send, Loader2, Bug, History } from 'lucide-react';
import { db, functions } from '../services/firebaseConfig';
import * as firestorePkg from 'firebase/firestore';
import * as functionsPkg from 'firebase/functions';

const { collection, query, orderBy, limit, getDocs } = firestorePkg as any;
const { httpsCallable } = functionsPkg as any;

export const YcloudTester = () => {
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('Mensagem de teste ProTrack');
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
      let payload: any = { to: phone, body: message };
      if (message.startsWith('{') && message.includes('"name"')) {
        try {
          const templateData = JSON.parse(message);
          payload.template = templateData;
        } catch (e) {
          console.warn('Mensagem parece JSON mas falhou no parse');
        }
      }
      const res = await sendYcloudWhatsApp(payload);
      setResult(res.data);
      // Refresh logs after sending
      setTimeout(fetchLogs, 1500);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 mt-8">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-purple-100 text-purple-600 rounded-xl">
            <Bug size={24} />
          </div>
          <div>
            <h3 className="font-bold text-slate-800">Testador de API WhatsApp (YCloud)</h3>
            <p className="text-sm text-slate-500">Envie uma mensagem manual para debugar problemas de envio.</p>
          </div>
        </div>

        <form onSubmit={handleTest} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Telefone de Destino (com DDD)</label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Ex: 11999999999"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-purple-500"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Mensagem</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-purple-500 min-h-[100px]"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl flex justify-center items-center gap-2 transition-all disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin" /> : <Send size={20} />}
            {loading ? 'Enviando...' : 'Enviar Teste'}
          </button>
        </form>

        {result && (
          <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-xl">
            <h4 className="font-bold text-green-800 mb-2">Sucesso!</h4>
            <pre className="text-xs text-green-700 overflow-x-auto">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}

        {error && (
          <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-xl">
            <h4 className="font-bold text-red-800 mb-2">Erro de Envio</h4>
            <pre className="text-xs text-red-700 whitespace-pre-wrap">
              {error}
            </pre>
          </div>
        )}
      </div>

      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-slate-100 text-slate-600 rounded-xl">
              <History size={24} />
            </div>
            <div>
              <h3 className="font-bold text-slate-800">Logs Recentes do YCloud</h3>
              <p className="text-sm text-slate-500">Últimas 15 mensagens enviadas (collection: message_logs)</p>
            </div>
          </div>
          <button 
            onClick={fetchLogs} 
            disabled={loadingLogs}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-sm transition-all"
          >
            {loadingLogs ? 'Atualizando...' : 'Atualizar'}
          </button>
        </div>

        {logs.length === 0 ? (
          <p className="text-center text-slate-400 py-8 italic">Nenhum log encontrado.</p>
        ) : (
          <div className="space-y-4">
            {logs.map((log) => (
              <div key={log.id} className="p-4 bg-slate-50 border border-slate-100 rounded-xl">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${log.status === 'SENT' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {log.status}
                    </span>
                    <span className="text-xs text-slate-500 font-mono">ID: {log.id}</span>
                  </div>
                  <span className="text-xs text-slate-400">
                    {log.createdAt instanceof Date ? log.createdAt.toLocaleString() : 'Sem data'}
                  </span>
                </div>
                <div className="text-sm text-slate-700 font-semibold mb-1">
                  Destinatário: <span className="font-mono text-indigo-600">{log.recipient}</span>
                </div>
                <div className="text-xs text-slate-600 bg-white p-3 rounded-lg border border-slate-200 font-mono overflow-x-auto whitespace-pre-wrap">
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
