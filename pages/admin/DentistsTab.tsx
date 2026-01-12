import React, { useState, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { ManualDentist } from '../../types';
import { 
  Plus, Search, Edit, Trash2, X, Stethoscope, 
  FileSpreadsheet, UploadCloud, Loader2, Sparkles, Check, AlertCircle, Save, FileText, BadgeCheck, Phone, Mail, IdCard 
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { GoogleGenAI } from "@google/genai";

export const DentistsTab = () => {
  const { manualDentists, addManualDentist, updateManualDentist, deleteManualDentist } = useApp();
  const [isAddingDentist, setIsAddingDentist] = useState(false);
  const [editingDentistId, setEditingDentistId] = useState<string | null>(null);
  const [dentistSearch, setDentistSearch] = useState('');

  // AI Import States
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [importPreview, setImportPreview] = useState<any[]>([]);
  const [importStatus, setImportStatus] = useState<'IDLE' | 'ANALYZING' | 'PREVIEW' | 'SAVING'>('IDLE');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form State
  const [dentistName, setDentistName] = useState('');
  const [dentistClinic, setDentistClinic] = useState('');
  const [dentistEmail, setDentistEmail] = useState('');
  const [dentistPhone, setDentistPhone] = useState('');
  const [dentistCpfCnpj, setDentistCpfCnpj] = useState('');
  const [dentistCro, setDentistCro] = useState('');

  const handleSaveManualDentist = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!dentistName) return;
      const data = { 
        name: dentistName, 
        clinicName: dentistClinic, 
        email: dentistEmail, 
        phone: dentistPhone,
        cpfCnpj: dentistCpfCnpj,
        cro: dentistCro
      };
      try {
          if (editingDentistId) {
              await updateManualDentist(editingDentistId, data);
          } else {
              await addManualDentist({ ...data, createdAt: new Date() });
          }
          setIsAddingDentist(false);
          setEditingDentistId(null);
          setDentistName(''); setDentistClinic(''); setDentistEmail(''); setDentistPhone(''); setDentistCpfCnpj(''); setDentistCro('');
      } catch (err) { alert("Erro ao salvar cliente."); }
  };

  // --- AI IMPORT LOGIC ---

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportStatus('ANALYZING');
    setIsAnalyzing(true);

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);

        if (data.length === 0) {
          alert("O arquivo parece estar vazio.");
          setImportStatus('IDLE');
          return;
        }

        // Usar Gemini para interpretar as colunas com foco nos campos solicitados
        const aiMapping = await analyzeColumnsWithAI(data.slice(0, 5));
        
        // Processar todos os dados com o mapeamento da IA
        const processedData = data.map((row: any) => ({
          name: row[aiMapping.name] || '',
          email: row[aiMapping.email] || '',
          phone: row[aiMapping.phone] || '',
          cpfCnpj: row[aiMapping.cpfCnpj] || '',
          cro: row[aiMapping.cro] || '',
          clinicName: row[aiMapping.clinicName] || '',
          isValid: !!row[aiMapping.name] // Apenas o nome é obrigatório
        }));

        setImportPreview(processedData);
        setImportStatus('PREVIEW');
      } catch (err) {
        console.error(err);
        alert("Erro ao processar arquivo Excel.");
        setImportStatus('IDLE');
      } finally {
        setIsAnalyzing(false);
      }
    };
    reader.readAsBinaryString(file);
  };

  const analyzeColumnsWithAI = async (sampleData: any[]) => {
    // Initializing Gemini client as per guidelines
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `
      Você é um especialista em extração de dados. Analise o cabeçalho e as primeiras linhas desta planilha de laboratório odontológico.
      Identifique quais colunas originais correspondem aos nossos campos internos:
      
      1. 'name': Nome do dentista, cliente ou doutor (MUITO IMPORTANTE).
      2. 'email': E-mail de contato.
      3. 'phone': Telefone, Celular ou WhatsApp.
      4. 'cpfCnpj': Documento, CPF, CNPJ ou Identificação Fiscal.
      5. 'cro': Registro Profissional ou CRO.
      6. 'clinicName': Nome da clínica ou consultório.

      JSON de amostra para análise: ${JSON.stringify(sampleData)}

      Retorne APENAS um objeto JSON puro com este formato:
      { 
        "name": "nome_da_coluna_no_excel", 
        "email": "nome_da_coluna_no_excel", 
        "phone": "nome_da_coluna_no_excel", 
        "cpfCnpj": "nome_da_coluna_no_excel", 
        "cro": "nome_da_coluna_no_excel",
        "clinicName": "nome_da_coluna_no_excel"
      }
      Se não houver uma coluna correspondente clara, retorne string vazia como valor.
    `;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: { 
            responseMimeType: "application/json",
            temperature: 0.1 // Mais determinístico
        }
      });
      return JSON.parse(response.text || '{}');
    } catch (error) {
      console.error("AI Error:", error);
      // Fallback básico para chaves comuns
      const keys = Object.keys(sampleData[0] || {});
      const findKey = (search: string[]) => keys.find(k => search.some(s => k.toLowerCase().includes(s))) || '';
      return {
        name: findKey(['nome', 'cliente', 'dr', 'doutor']) || keys[0],
        email: findKey(['email', 'e-mail', 'contato']),
        phone: findKey(['tel', 'cel', 'whats', 'fone']),
        cpfCnpj: findKey(['cpf', 'cnpj', 'doc', 'documento']),
        cro: findKey(['cro', 'registro']),
        clinicName: findKey(['clínica', 'consultório', 'empresa'])
      };
    }
  };

  const saveImportedData = async () => {
    setImportStatus('SAVING');
    try {
      const validItems = importPreview.filter(p => p.isValid);
      let count = 0;
      for (const item of validItems) {
        await addManualDentist({
          name: item.name,
          email: item.email || '',
          phone: String(item.phone || ''),
          cpfCnpj: String(item.cpfCnpj || ''),
          cro: String(item.cro || ''),
          clinicName: item.clinicName || '',
          createdAt: new Date()
        });
        count++;
      }
      alert(`${count} clientes cadastrados com sucesso!`);
      setIsImportModalOpen(false);
      setImportPreview([]);
      setImportStatus('IDLE');
    } catch (err) {
      alert("Erro ao salvar dados importados.");
      setImportStatus('PREVIEW');
    }
  };

  const filteredDentists = manualDentists.filter(d => 
    d.name.toLowerCase().includes(dentistSearch.toLowerCase()) || 
    (d.clinicName || '').toLowerCase().includes(dentistSearch.toLowerCase()) ||
    (d.cro || '').toLowerCase().includes(dentistSearch.toLowerCase()) ||
    (d.cpfCnpj || '').toLowerCase().includes(dentistSearch.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-left-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
              Clientes Internos (Offline)
            </h3>
            <div className="flex gap-2 w-full md:w-auto">
                <button 
                  onClick={() => setIsImportModalOpen(true)}
                  className="flex-1 md:flex-none px-4 py-2 bg-indigo-50 text-indigo-700 font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-indigo-100 transition-all border border-indigo-200"
                >
                    <FileSpreadsheet size={18}/> Importar Planilha IA
                </button>
                <button onClick={() => setIsAddingDentist(true)} className="flex-1 md:flex-none px-4 py-2 bg-blue-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all">
                    <Plus size={20}/> Novo Cadastro
                </button>
            </div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
            <div className="relative">
                <Search className="absolute left-3 top-3 text-slate-400" size={18} />
                <input 
                    placeholder="Filtrar por nome, clínica, CRO ou documento..." 
                    className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" 
                    value={dentistSearch} 
                    onChange={e => setDentistSearch(e.target.value)}
                />
            </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-xs font-bold text-slate-500 uppercase border-b">
                  <tr>
                    <th className="p-4">Nome / Clínica</th>
                    <th className="p-4">Documento / CRO</th>
                    <th className="p-4">Contato</th>
                    <th className="p-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredDentists.length === 0 ? (
                    <tr><td colSpan={4} className="p-12 text-center text-slate-400 italic font-medium">Nenhum cliente cadastrado. Use o botão acima para adicionar ou importar.</td></tr>
                  ) : (
                    filteredDentists.map(dentist => (
                      <tr key={dentist.id} className="hover:bg-slate-50 transition-colors group">
                        <td className="p-4">
                          <div className="font-bold text-slate-800">{dentist.name}</div>
                          <div className="text-[10px] text-slate-400 font-black uppercase tracking-tighter">{dentist.clinicName || '---'}</div>
                        </td>
                        <td className="p-4">
                          <div className="text-xs font-bold text-slate-700">{dentist.cpfCnpj || '---'}</div>
                          {dentist.cro && (
                            <div className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-black w-fit mt-1 uppercase tracking-tighter">CRO: {dentist.cro}</div>
                          )}
                        </td>
                        <td className="p-4">
                          <div className="text-xs text-slate-500 font-medium flex items-center gap-1"><Mail size={12} className="text-slate-300"/> {dentist.email || '---'}</div>
                          <div className="text-xs font-black text-slate-400 uppercase tracking-tighter flex items-center gap-1"><Phone size={12} className="text-slate-300"/> {dentist.phone || '---'}</div>
                        </td>
                        <td className="p-4 text-right">
                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => {
                                    setEditingDentistId(dentist.id);
                                    setDentistName(dentist.name);
                                    setDentistClinic(dentist.clinicName || '');
                                    setDentistEmail(dentist.email || '');
                                    setDentistPhone(dentist.phone || '');
                                    setDentistCpfCnpj(dentist.cpfCnpj || '');
                                    setDentistCro(dentist.cro || '');
                                    setIsAddingDentist(true);
                                }} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"><Edit size={18}/></button>
                                <button onClick={() => deleteManualDentist(dentist.id)} className="p-2 text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={18}/></button>
                            </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
        </div>

        {/* MODAL: NOVO/EDITAR CLIENTE */}
        {isAddingDentist && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
              <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 animate-in zoom-in duration-200">
                  <div className="flex justify-between items-center mb-6 border-b pb-4 border-slate-100">
                      <h3 className="text-xl font-black flex items-center gap-2 text-slate-800"><Stethoscope className="text-blue-600" /> {editingDentistId ? 'Editar Cliente' : 'Novo Cliente'}</h3>
                      <button onClick={() => { setIsAddingDentist(false); setEditingDentistId(null); }} className="text-slate-400 hover:text-slate-600"><X size={24}/></button>
                  </div>
                  <form onSubmit={handleSaveManualDentist} className="space-y-4">
                      <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-1 ml-1">Nome Completo</label><input required value={dentistName} onChange={e => setDentistName(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all" /></div>
                      <div className="grid grid-cols-2 gap-4">
                        <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-1 ml-1">CPF / CNPJ</label><input value={dentistCpfCnpj} onChange={e => setDentistCpfCnpj(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all" /></div>
                        <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-1 ml-1">CRO</label><input value={dentistCro} onChange={e => setDentistCro(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all" /></div>
                      </div>
                      <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-1 ml-1">E-mail</label><input type="email" value={dentistEmail} onChange={e => setDentistEmail(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all" /></div>
                      <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-1 ml-1">Telefone / WhatsApp</label><input value={dentistPhone} onChange={e => setDentistPhone(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all" /></div>
                      <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-1 ml-1">Clínica / Obs</label><input value={dentistClinic} onChange={e => setDentistClinic(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all" /></div>
                      <button type="submit" className="w-full py-4 bg-blue-600 text-white font-black rounded-2xl shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all transform active:scale-95">SALVAR CADASTRO</button>
                  </form>
              </div>
          </div>
        )}

        {/* MODAL: IMPORTAR EXCEL IA */}
        {isImportModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
            <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in duration-300">
              {/* Header */}
              <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-100">
                    <Sparkles size={24} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-slate-800">Agente de Importação IA</h2>
                    <p className="text-slate-500 text-sm font-medium">Extraímos automaticamente Nome, Documento, CRO, E-mail e Telefone.</p>
                  </div>
                </div>
                <button onClick={() => { setIsImportModalOpen(false); setImportStatus('IDLE'); }} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><X size={28} className="text-slate-400"/></button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-8 bg-slate-50/30">
                {importStatus === 'IDLE' && (
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="border-4 border-dashed border-slate-200 rounded-[24px] p-20 text-center hover:border-indigo-400 hover:bg-indigo-50 transition-all cursor-pointer group"
                  >
                    <input 
                      type="file" 
                      accept=".xlsx, .xls, .csv" 
                      className="hidden" 
                      ref={fileInputRef} 
                      onChange={handleFileUpload} 
                    />
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                        <UploadCloud size={40} />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-slate-700">Selecione seu arquivo de clientes</h3>
                        <p className="text-slate-400 mt-1">Excel ou CSV - Não importa a ordem das colunas, a IA resolve.</p>
                      </div>
                    </div>
                  </div>
                )}

                {importStatus === 'ANALYZING' && (
                  <div className="flex flex-col items-center justify-center py-24 text-center space-y-4">
                    <div className="relative">
                      <Loader2 size={64} className="text-indigo-600 animate-spin" />
                      <Sparkles size={24} className="text-amber-500 absolute top-0 right-0 animate-pulse" />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-slate-800">Agente IA Identificando Colunas...</h3>
                      <p className="text-slate-500 max-w-sm mx-auto mt-2">
                        Estou lendo os cabeçalhos para encontrar Nomes, Documentos, CROs e Contatos.
                      </p>
                    </div>
                  </div>
                )}

                {importStatus === 'PREVIEW' && (
                  <div className="space-y-6">
                    <div className="bg-white p-5 rounded-2xl border border-indigo-100 flex items-start gap-4 shadow-sm">
                      <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                        <BadgeCheck size={24}/>
                      </div>
                      <div>
                        <p className="font-bold text-indigo-900">Mapeamento Concluído!</p>
                        <p className="text-xs text-indigo-700">Confira os dados extraídos. O sistema aceitará o cadastro mesmo que Documento, CRO ou Email não estejam preenchidos.</p>
                      </div>
                    </div>

                    <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm bg-white overflow-x-auto">
                      <table className="w-full text-left min-w-[900px]">
                        <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase border-b">
                          <tr>
                            <th className="p-4">Cliente (Obrigatório)</th>
                            <th className="p-4">Documento</th>
                            <th className="p-4">CRO</th>
                            <th className="p-4">E-mail</th>
                            <th className="p-4">Telefone</th>
                            <th className="p-4 text-center">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {importPreview.slice(0, 100).map((item, idx) => (
                            <tr key={idx} className={item.isValid ? 'bg-white' : 'bg-red-50'}>
                              <td className="p-4">
                                <div className="font-bold text-sm text-slate-700">{item.name || 'NOME AUSENTE'}</div>
                                <div className="text-[9px] text-slate-400 font-bold uppercase">{item.clinicName}</div>
                              </td>
                              <td className="p-4 text-sm text-slate-600 font-medium font-mono">{item.cpfCnpj || '---'}</td>
                              <td className="p-4">
                                {item.cro ? <span className="bg-blue-50 text-blue-600 text-[10px] px-2 py-0.5 rounded font-black border border-blue-100">{item.cro}</span> : <span className="text-slate-300">---</span>}
                              </td>
                              <td className="p-4 text-xs text-slate-500">{item.email || '---'}</td>
                              <td className="p-4 text-xs text-slate-500 font-bold">{item.phone || '---'}</td>
                              <td className="p-4 text-center">
                                {/* Fix: Removed invalid title prop from X icon and wrapped in span */}
                                {item.isValid ? <Check size={18} className="text-green-500 mx-auto"/> : <span title="Sem nome"><X size={18} className="text-red-500 mx-auto" /></span>}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {importPreview.length > 100 && (
                        <div className="p-4 text-center bg-slate-50 text-[10px] font-black text-slate-400 uppercase">
                          + {importPreview.length - 100} registros ocultos (serão importados em lote)
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-8 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
                 <button 
                  onClick={() => { setImportStatus('IDLE'); setImportPreview([]); }}
                  className="px-6 py-3 font-bold text-slate-500 hover:text-slate-800 transition-colors"
                 >
                    Cancelar
                 </button>
                 {(importStatus === 'PREVIEW' || importStatus === 'SAVING') && (
                   <button 
                    onClick={saveImportedData}
                    disabled={importStatus === 'SAVING'}
                    className="px-10 py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-xl shadow-indigo-100 hover:bg-indigo-700 flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                   >
                     {importStatus === 'SAVING' ? <Loader2 className="animate-spin" /> : <><Save size={20}/> CONFIRMAR CADASTRO EM LOTE</>}
                   </button>
                 )}
              </div>
            </div>
          </div>
        )}
    </div>
  );
};