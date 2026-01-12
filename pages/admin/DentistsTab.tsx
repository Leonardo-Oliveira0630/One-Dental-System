
import React, { useState, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { ManualDentist } from '../../types';
import { 
  Plus, Search, Edit, Trash2, X, Stethoscope, 
  FileSpreadsheet, UploadCloud, Loader2, Sparkles, Check, Save, BadgeCheck, Phone, Mail, MapPin, Calendar, Globe, Hash
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { GoogleGenAI } from "@google/genai";

export const DentistsTab = () => {
  const { manualDentists, addManualDentist, updateManualDentist, deleteManualDentist } = useApp();
  const [isAddingDentist, setIsAddingDentist] = useState(false);
  const [editingDentistId, setEditingDentistId] = useState<string | null>(null);
  const [dentistSearch, setSearchTerm] = useState('');

  // AI Import States
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [importPreview, setImportPreview] = useState<any[]>([]);
  const [importStatus, setImportStatus] = useState<'IDLE' | 'ANALYZING' | 'PREVIEW' | 'SAVING'>('IDLE');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    cpfCnpj: '',
    cro: '',
    birthDate: '',
    approvalDate: '',
    cep: '',
    address: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: '',
    country: 'Brasil',
    clinicName: ''
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveManualDentist = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!formData.name) return;
      try {
          if (editingDentistId) {
              await updateManualDentist(editingDentistId, formData);
          } else {
              await addManualDentist({ ...formData, createdAt: new Date() });
          }
          setIsAddingDentist(false);
          setEditingDentistId(null);
          resetForm();
      } catch (err) { alert("Erro ao salvar cliente."); }
  };

  const resetForm = () => {
    setFormData({
      name: '', email: '', phone: '', cpfCnpj: '', cro: '',
      birthDate: '', approvalDate: '', cep: '', address: '',
      number: '', complement: '', neighborhood: '', city: '',
      state: '', country: 'Brasil', clinicName: ''
    });
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

        const aiMapping = await analyzeColumnsWithAI(data.slice(0, 10));
        
        const processedData = data.map((row: any) => {
            const getVal = (key: string) => {
                const colName = aiMapping[key];
                if (!colName) return '';
                const val = row[colName];
                return val !== undefined && val !== null ? String(val).trim() : '';
            };

            return {
                name: getVal('name'),
                email: getVal('email'),
                phone: getVal('phone'),
                cpfCnpj: getVal('cpfCnpj'),
                cro: getVal('cro'),
                birthDate: getVal('birthDate'),
                approvalDate: getVal('approvalDate'),
                cep: getVal('cep'),
                address: getVal('address'),
                number: getVal('number'),
                complement: getVal('complement'),
                neighborhood: getVal('neighborhood'),
                city: getVal('city'),
                state: getVal('state'),
                country: getVal('country') || 'Brasil',
                clinicName: getVal('clinicName'),
                isValid: !!getVal('name')
            };
        });

        setImportPreview(processedData);
        setImportStatus('PREVIEW');
      } catch (err) {
        console.error(err);
        alert("Erro ao processar arquivo.");
        setImportStatus('IDLE');
      } finally {
        setIsAnalyzing(false);
      }
    };
    reader.readAsBinaryString(file);
  };

  const analyzeColumnsWithAI = async (sampleData: any[]) => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const prompt = `
      Você é um especialista em mapeamento de planilhas Excel para sistemas odontológicos.
      Analise rigorosamente estas primeiras linhas da planilha: ${JSON.stringify(sampleData)}

      MAPEIE AS COLUNAS ORIGINAIS PARA NOSSOS CAMPOS INTERNOS:
      - 'name': Coluna "Nome" ou similar.
      - 'email': Coluna "E-mail" ou "Email".
      - 'birthDate': Coluna "Data de nascimento".
      - 'phone': Coluna "Telefone", "Celular" ou "WhatsApp".
      - 'cpfCnpj': Coluna "Documento", "CPF" ou "CNPJ".
      - 'cro': Coluna "CRO" ou "Registro Profissional" ou "Conselho". (IMPORTANTE: NÃO CONFUNDA COM DOCUMENTO/CPF).
      - 'approvalDate': Coluna "Data de aprovação".
      - 'cep': Coluna "CEP".
      - 'address': Coluna "Logradouro" ou "Endereço".
      - 'number': Coluna "Número".
      - 'complement': Coluna "Complemento".
      - 'neighborhood': Coluna "Bairro".
      - 'city': Coluna "Cidade".
      - 'state': Coluna "Estado" ou "UF".
      - 'country': Coluna "País".
      - 'clinicName': Qualquer coluna que indique nome de clínica ou consultório.

      REGRAS:
      1. Se o nome da coluna no Excel for exatamente um dos citados acima, use-o.
      2. Se não houver correspondência clara, deixe vazio "".
      3. O campo 'cro' é específico para o número do registro profissional.

      RETORNE APENAS JSON PURO:
      {
        "name": "nome_da_coluna_no_excel",
        "email": "nome_da_coluna_no_excel",
        "birthDate": "nome_da_coluna_no_excel",
        "phone": "nome_da_coluna_no_excel",
        "cpfCnpj": "nome_da_coluna_no_excel",
        "cro": "nome_da_coluna_no_excel",
        "approvalDate": "nome_da_coluna_no_excel",
        "cep": "nome_da_coluna_no_excel",
        "address": "nome_da_coluna_no_excel",
        "number": "nome_da_coluna_no_excel",
        "complement": "nome_da_coluna_no_excel",
        "neighborhood": "nome_da_coluna_no_excel",
        "city": "nome_da_coluna_no_excel",
        "state": "nome_da_coluna_no_excel",
        "country": "nome_da_coluna_no_excel",
        "clinicName": "nome_da_coluna_no_excel"
      }
    `;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: { 
          responseMimeType: "application/json",
          temperature: 0.1 
        }
      });
      
      return JSON.parse(response.text || '{}');
    } catch (error) {
      // Fallback manual robusto
      const keys = Object.keys(sampleData[0] || {});
      const f = (exacts: string[]) => keys.find(k => exacts.some(e => k.toLowerCase().trim() === e.toLowerCase())) || '';
      const contains = (search: string) => keys.find(k => k.toLowerCase().includes(search.toLowerCase())) || '';

      return {
        name: f(["Nome", "Cliente", "Dentista", "Doutor"]),
        email: f(["E-mail", "Email", "Contato"]),
        birthDate: f(["Data de nascimento", "Nascimento", "Data Nasc"]),
        phone: f(["Telefone", "Celular", "WhatsApp", "Fone"]),
        cpfCnpj: f(["Documento", "CPF", "CNPJ", "Doc"]),
        cro: f(["CRO", "C.R.O", "Registro Profissional", "Inscrição", "Registro"]),
        approvalDate: f(["Data de aprovação", "Aprovação", "Data Aprov"]),
        cep: f(["CEP", "Cod Postal"]),
        address: f(["Logradouro", "Endereço", "Rua"]),
        number: f(["Número", "Nº", "Num"]),
        complement: f(["Complemento", "Sala", "Apt"]),
        neighborhood: f(["Bairro"]),
        city: f(["Cidade"]),
        state: f(["Estado", "UF"]),
        country: f(["País", "Country"]),
        clinicName: contains("Clínica") || contains("Consultório")
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
          ...item,
          createdAt: new Date()
        });
        count++;
      }
      alert(`${count} clientes cadastrados com sucesso!`);
      setIsImportModalOpen(false);
      setImportPreview([]);
      setImportStatus('IDLE');
    } catch (err) {
      alert("Erro ao salvar dados.");
      setImportStatus('PREVIEW');
    }
  };

  const filteredDentists = manualDentists.filter(d => 
    d.name.toLowerCase().includes(dentistSearch.toLowerCase()) || 
    (d.cro || '').includes(dentistSearch) ||
    (d.cpfCnpj || '').includes(dentistSearch)
  );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-left-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">Clientes Internos (Offline)</h3>
            <div className="flex gap-2 w-full md:w-auto">
                <button onClick={() => setIsImportModalOpen(true)} className="flex-1 md:flex-none px-4 py-2 bg-indigo-50 text-indigo-700 font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-indigo-100 transition-all border border-indigo-200">
                    <FileSpreadsheet size={18}/> Importar Completo (IA)
                </button>
                <button onClick={() => { resetForm(); setIsAddingDentist(true); }} className="flex-1 md:flex-none px-4 py-2 bg-blue-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg hover:bg-blue-700 transition-all">
                    <Plus size={20}/> Novo Cadastro
                </button>
            </div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
            <div className="relative">
                <Search className="absolute left-3 top-3 text-slate-400" size={18} />
                <input 
                    placeholder="Filtrar por nome, CRO ou documento..." 
                    className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" 
                    value={dentistSearch} 
                    onChange={e => setSearchTerm(e.target.value)}
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
                    <th className="p-4">Cidade / UF</th>
                    <th className="p-4">Contato</th>
                    <th className="p-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredDentists.length === 0 ? (
                    <tr><td colSpan={5} className="p-12 text-center text-slate-400 italic">Nenhum cliente cadastrado.</td></tr>
                  ) : (
                    filteredDentists.map(dentist => (
                      <tr key={dentist.id} className="hover:bg-slate-50 transition-colors group">
                        <td className="p-4">
                          <div className="font-bold text-slate-800">{dentist.name}</div>
                          <div className="text-[10px] text-slate-400 font-black uppercase">{dentist.clinicName || '---'}</div>
                        </td>
                        <td className="p-4 text-xs">
                          <div className="font-bold text-slate-700">{dentist.cpfCnpj || '---'}</div>
                          <div className="text-[10px] text-blue-600 font-bold uppercase">CRO: {dentist.cro || '---'}</div>
                        </td>
                        <td className="p-4 text-xs font-medium text-slate-600">
                          {dentist.city ? `${dentist.city} / ${dentist.state || ''}` : '---'}
                        </td>
                        <td className="p-4">
                          <div className="text-xs text-slate-500 flex items-center gap-1"><Mail size={12}/> {dentist.email || '---'}</div>
                          <div className="text-xs font-bold text-slate-400 flex items-center gap-1"><Phone size={12}/> {dentist.phone || '---'}</div>
                        </td>
                        <td className="p-4 text-right">
                            <div className="flex justify-end gap-2">
                                <button onClick={() => {
                                    setEditingDentistId(dentist.id);
                                    setFormData({ ...dentist } as any);
                                    setIsAddingDentist(true);
                                }} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg"><Edit size={18}/></button>
                                <button onClick={() => deleteManualDentist(dentist.id)} className="p-2 text-slate-300 hover:text-red-500"><Trash2 size={18}/></button>
                            </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
        </div>

        {/* MODAL: CADASTRO MANUAL */}
        {isAddingDentist && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
              <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl my-auto animate-in zoom-in duration-200">
                  <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-3xl">
                      <h3 className="text-xl font-black flex items-center gap-2 text-slate-800"><Stethoscope className="text-blue-600" /> {editingDentistId ? 'Editar Cadastro' : 'Ficha de Cliente'}</h3>
                      <button onClick={() => { setIsAddingDentist(false); setEditingDentistId(null); }} className="text-slate-400 hover:text-slate-600"><X size={24}/></button>
                  </div>
                  <form onSubmit={handleSaveManualDentist} className="p-6 space-y-6">
                      {/* Seção 1: Dados Pessoais */}
                      <div>
                        <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-3 border-b border-blue-100 pb-1">1. Identificação e Contato</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="md:col-span-2">
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">Nome Completo *</label>
                            <input name="name" required value={formData.name} onChange={handleInputChange} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">E-mail</label>
                            <input name="email" type="email" value={formData.email} onChange={handleInputChange} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl" />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">Telefone / WhatsApp</label>
                            <input name="phone" value={formData.phone} onChange={handleInputChange} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl" />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">Data de Nascimento</label>
                            <input name="birthDate" type="date" value={formData.birthDate} onChange={handleInputChange} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl" />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">Clínica</label>
                            <input name="clinicName" value={formData.clinicName} onChange={handleInputChange} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl" />
                          </div>
                        </div>
                      </div>

                      {/* Seção 2: Documentação */}
                      <div>
                        <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-3 border-b border-blue-100 pb-1">2. Documentação e Registro</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">CPF / CNPJ</label>
                            <input name="cpfCnpj" value={formData.cpfCnpj} onChange={handleInputChange} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl" />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">CRO</label>
                            <input name="cro" value={formData.cro} onChange={handleInputChange} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl" />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">Data Aprovação</label>
                            <input name="approvalDate" type="date" value={formData.approvalDate} onChange={handleInputChange} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl" />
                          </div>
                        </div>
                      </div>

                      {/* Seção 3: Endereço */}
                      <div>
                        <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-3 border-b border-blue-100 pb-1">3. Localização</h4>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">CEP</label>
                            <input name="cep" value={formData.cep} onChange={handleInputChange} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl" />
                          </div>
                          <div className="md:col-span-2">
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">Logradouro</label>
                            <input name="address" value={formData.address} onChange={handleInputChange} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl" />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">Número</label>
                            <input name="number" value={formData.number} onChange={handleInputChange} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl" />
                          </div>
                          <div className="md:col-span-2">
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">Bairro</label>
                            <input name="neighborhood" value={formData.neighborhood} onChange={handleInputChange} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl" />
                          </div>
                          <div className="md:col-span-2">
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">Cidade</label>
                            <input name="city" value={formData.city} onChange={handleInputChange} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl" />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">Estado (UF)</label>
                            <input name="state" value={formData.state} onChange={handleInputChange} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl" />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">País</label>
                            <input name="country" value={formData.country} onChange={handleInputChange} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl" />
                          </div>
                        </div>
                      </div>

                      <button type="submit" className="w-full py-4 bg-blue-600 text-white font-black rounded-2xl shadow-xl hover:bg-blue-700 transition-all transform active:scale-95">SALVAR FICHA COMPLETA</button>
                  </form>
              </div>
          </div>
        )}

        {/* MODAL: IMPORTAR EXCEL IA */}
        {isImportModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
            <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in duration-300">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-lg"><Sparkles size={24} /></div>
                  <div>
                    <h2 className="text-2xl font-black text-slate-800">Agente de Importação Inteligente</h2>
                    <p className="text-slate-500 text-sm font-medium">Diferenciamos automaticamente Documento de Registro Profissional (CRO).</p>
                  </div>
                </div>
                <button onClick={() => { setIsImportModalOpen(false); setImportStatus('IDLE'); }} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><X size={28} className="text-slate-400"/></button>
              </div>

              <div className="flex-1 overflow-y-auto p-8">
                {importStatus === 'IDLE' && (
                  <div onClick={() => fileInputRef.current?.click()} className="border-4 border-dashed border-slate-200 rounded-[24px] p-20 text-center hover:border-indigo-400 hover:bg-indigo-50 transition-all cursor-pointer group">
                    <input type="file" accept=".xlsx, .xls, .csv" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
                    <UploadCloud size={48} className="mx-auto text-slate-300 mb-4 group-hover:text-indigo-500" />
                    <h3 className="text-xl font-bold text-slate-700">Selecione sua planilha com as colunas Nome, E-mail, Documento, CRO, etc.</h3>
                    <p className="text-slate-400 mt-2 italic">A IA identificará cada campo mesmo que estejam em ordens diferentes.</p>
                  </div>
                )}

                {importStatus === 'ANALYZING' && (
                  <div className="flex flex-col items-center justify-center py-24 text-center space-y-4">
                    <Loader2 size={64} className="text-indigo-600 animate-spin" />
                    <h3 className="text-xl font-black text-slate-800">Mapeando Colunas com IA...</h3>
                    <p className="text-slate-500">Separando Documentos de CROs.</p>
                  </div>
                )}

                {importStatus === 'PREVIEW' && (
                  <div className="space-y-6">
                    <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100 flex items-center gap-4 text-indigo-700">
                      <BadgeCheck size={24}/> <p className="font-bold">Mapeamento concluído! Verifique a coluna **CRO** e **Documento** abaixo.</p>
                    </div>

                    <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm bg-white overflow-x-auto">
                      <table className="w-full text-left min-w-[1200px]">
                        <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase border-b">
                          <tr>
                            <th className="p-4">Cliente</th>
                            <th className="p-4">Nascimento / Aprovação</th>
                            <th className="p-4">Documento (CPF)</th>
                            <th className="p-4">CRO</th>
                            <th className="p-4">Endereço Completo</th>
                            <th className="p-4">Contatos</th>
                            <th className="p-4 text-center">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {importPreview.slice(0, 100).map((item, idx) => (
                            <tr key={idx} className={item.isValid ? 'bg-white' : 'bg-red-50'}>
                              <td className="p-4">
                                <div className="font-bold text-sm text-slate-700">{item.name || '---'}</div>
                                <div className="text-[9px] text-slate-400 font-bold uppercase">{item.clinicName}</div>
                              </td>
                              <td className="p-4 text-xs font-medium text-slate-600">
                                <div>Nasc: {item.birthDate || '---'}</div>
                                <div>Aprov: {item.approvalDate || '---'}</div>
                              </td>
                              <td className="p-4 text-sm text-slate-600 font-mono">{item.cpfCnpj || '---'}</td>
                              <td className="p-4">
                                {item.cro ? <span className="bg-blue-50 text-blue-600 text-[10px] px-2 py-0.5 rounded font-black border border-blue-100">CRO: {item.cro}</span> : <span className="text-slate-300">---</span>}
                              </td>
                              <td className="p-4 text-[10px] leading-tight text-slate-500 max-w-xs">
                                <p className="font-bold text-slate-700">{item.address}{item.number ? `, ${item.number}` : ''}</p>
                                <p>{item.neighborhood}{item.city ? ` - ${item.city}` : ''}{item.state ? `/${item.state}` : ''}</p>
                                <p>{item.cep ? `CEP: ${item.cep}` : ''} {item.country ? `| ${item.country}` : ''}</p>
                              </td>
                              <td className="p-4 text-xs">
                                <div>{item.email || '---'}</div>
                                <div className="font-bold">{item.phone || '---'}</div>
                              </td>
                              <td className="p-4 text-center">
                                {item.isValid ? <Check size={18} className="text-green-500 mx-auto"/> : <span title="Sem nome"><X size={18} className="text-red-500 mx-auto" /></span>}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-8 bg-slate-50 border-t flex justify-between items-center">
                 <button onClick={() => { setImportStatus('IDLE'); setImportPreview([]); }} className="px-6 py-3 font-bold text-slate-500">Cancelar</button>
                 {(importStatus === 'PREVIEW' || importStatus === 'SAVING') && (
                   <button onClick={saveImportedData} disabled={importStatus === 'SAVING'} className="px-10 py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-xl hover:bg-indigo-700 flex items-center gap-2 transition-all disabled:opacity-50">
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
