
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

  // Form State (Expanded)
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

  // --- AI IMPORT LOGIC (REFINED) ---

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

        // Gemini tenta mapear as colunas
        const aiMapping = await analyzeColumnsWithAI(data.slice(0, 5));
        
        // Processar os dados usando o mapeamento retornado pela IA
        const processedData = data.map((row: any) => ({
          name: row[aiMapping.name] || '',
          email: row[aiMapping.email] || '',
          phone: row[aiMapping.phone] || '',
          cpfCnpj: row[aiMapping.cpfCnpj] || '',
          cro: row[aiMapping.cro] || '',
          birthDate: row[aiMapping.birthDate] || '',
          approvalDate: row[aiMapping.approvalDate] || '',
          cep: row[aiMapping.cep] || '',
          address: row[aiMapping.address] || '',
          number: row[aiMapping.number] || '',
          complement: row[aiMapping.complement] || '',
          neighborhood: row[aiMapping.neighborhood] || '',
          city: row[aiMapping.city] || '',
          state: row[aiMapping.state] || '',
          country: row[aiMapping.country] || 'Brasil',
          clinicName: row[aiMapping.clinicName] || '',
          isValid: !!row[aiMapping.name] // Nome é o único obrigatório
        }));

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
    
    // Nomes de colunas alvo (Exatos como solicitado pelo usuário)
    const targetColumns = [
      "Nome", "E-mail", "Data de nascimento", "Telefone", "Documento", 
      "CRO", "Data de aprovação", "CEP", "Logradouro", "Número", 
      "Complemento", "Bairro", "Cidade", "Estado", "País"
    ];

    const prompt = `
      Você é um especialista em extração de dados de planilhas odontológicas.
      Analise este JSON que contém as primeiras linhas de uma planilha Excel: ${JSON.stringify(sampleData)}

      Sua missão é identificar qual coluna da planilha corresponde aos nossos campos internos.
      PRIORIZE correspondências exatas com estes nomes de colunas:
      - 'name' deve mapear para a coluna "Nome"
      - 'email' deve mapear para a coluna "E-mail"
      - 'birthDate' deve mapear para a coluna "Data de nascimento"
      - 'phone' deve mapear para a coluna "Telefone"
      - 'cpfCnpj' deve mapear para a coluna "Documento"
      - 'cro' deve mapear para a coluna "CRO"
      - 'approvalDate' deve mapear para a coluna "Data de aprovação"
      - 'cep' deve mapear para a coluna "CEP"
      - 'address' deve mapear para a coluna "Logradouro"
      - 'number' deve mapear para a coluna "Número"
      - 'complement' deve mapear para a coluna "Complemento"
      - 'neighborhood' deve mapear para a coluna "Bairro"
      - 'city' deve mapear para a coluna "Cidade"
      - 'state' deve mapear para a coluna "Estado"
      - 'country' deve mapear para a coluna "País"
      - 'clinicName' deve mapear para qualquer coluna de Clínica ou Empresa.

      Caso não encontre o nome exato, use lógica para encontrar o mais próximo (ex: "Doc" vira "cpfCnpj").
      
      Retorne APENAS um JSON puro (sem markdown) no seguinte formato:
      {
        "name": "Nome da Coluna na Planilha",
        "email": "Nome da Coluna na Planilha",
        ... (todos os campos acima)
      }
      Se o campo não existir na planilha, deixe o valor como string vazia "".
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
      
      const mapping = JSON.parse(response.text || '{}');
      console.log("IA Mapping Result:", mapping);
      return mapping;
    } catch (error) {
      console.error("AI Mapping failed, using strict fallback:", error);
      // Fallback: Busca manual pelas colunas exatas
      const keys = Object.keys(sampleData[0] || {});
      const find = (exact: string) => keys.find(k => k.toLowerCase().trim() === exact.toLowerCase().trim()) || '';
      
      return {
        name: find("Nome"),
        email: find("E-mail"),
        birthDate: find("Data de nascimento"),
        phone: find("Telefone"),
        cpfCnpj: find("Documento"),
        cro: find("CRO"),
        approvalDate: find("Data de aprovação"),
        cep: find("CEP"),
        address: find("Logradouro"),
        number: find("Número"),
        complement: find("Complemento"),
        neighborhood: find("Bairro"),
        city: find("Cidade"),
        state: find("Estado"),
        country: find("País"),
        clinicName: find("Clínica")
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
          phone: String(item.phone || ''),
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
                    <p className="text-slate-500 text-sm font-medium">Priorizamos as colunas padrão que você definiu.</p>
                  </div>
                </div>
                <button onClick={() => { setIsImportModalOpen(false); setImportStatus('IDLE'); }} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><X size={28} className="text-slate-400"/></button>
              </div>

              <div className="flex-1 overflow-y-auto p-8">
                {importStatus === 'IDLE' && (
                  <div onClick={() => fileInputRef.current?.click()} className="border-4 border-dashed border-slate-200 rounded-[24px] p-20 text-center hover:border-indigo-400 hover:bg-indigo-50 transition-all cursor-pointer group">
                    <input type="file" accept=".xlsx, .xls, .csv" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
                    <UploadCloud size={48} className="mx-auto text-slate-300 mb-4 group-hover:text-indigo-500" />
                    <h3 className="text-xl font-bold text-slate-700">Selecione sua planilha com as colunas Nome, E-mail, Documento, etc.</h3>
                    <p className="text-slate-400 mt-2 italic">O Agente IA fará o "de-para" automático para você.</p>
                  </div>
                )}

                {importStatus === 'ANALYZING' && (
                  <div className="flex flex-col items-center justify-center py-24 text-center space-y-4">
                    <Loader2 size={64} className="text-indigo-600 animate-spin" />
                    <h3 className="text-xl font-black text-slate-800">Mapeando Colunas com IA...</h3>
                    <p className="text-slate-500">Aguarde, estamos cruzando os dados da planilha.</p>
                  </div>
                )}

                {importStatus === 'PREVIEW' && (
                  <div className="space-y-6">
                    <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100 flex items-center gap-4 text-indigo-700">
                      <BadgeCheck size={24}/> <p className="font-bold">Mapeamento concluído! Verifique os dados abaixo antes de salvar.</p>
                    </div>

                    <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm bg-white overflow-x-auto">
                      <table className="w-full text-left min-w-[1200px]">
                        <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase border-b">
                          <tr>
                            <th className="p-4">Cliente</th>
                            <th className="p-4">Nascimento / Aprovação</th>
                            <th className="p-4">Docs / CRO</th>
                            <th className="p-4">Endereço Completo Extraído</th>
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
                              <td className="p-4 text-xs">
                                <div>Doc: {item.cpfCnpj || '---'}</div>
                                <div className="text-blue-600 font-bold">CRO: {item.cro || '---'}</div>
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
