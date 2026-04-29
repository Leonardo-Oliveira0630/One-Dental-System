
import React, { useState, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { ManualDentist, UserRole, PermissionKey } from '../../types';
import { 
  Plus, Search, Edit, Trash2, X, Stethoscope, 
  FileSpreadsheet, UploadCloud, Loader2, Sparkles, Check, Save, BadgeCheck, Phone, Mail, MapPin, Calendar, Globe, Hash, Truck, Package, DollarSign, Lock, Unlock, Table, Percent
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { GoogleGenAI } from "@google/genai";
import { searchCEP, searchLoqateAddress, fetchLoqateRetrieve, searchInternationalZip } from '../../services/addressService';

export const DentistsTab = () => {
  const { manualDentists, addManualDentist, updateManualDentist, deleteManualDentist, priceTables, currentUser, jobTypes } = useApp();
  const [isAddingDentist, setIsAddingDentist] = useState(false);
  const [editingDentistId, setEditingDentistId] = useState<string | null>(null);
  const [dentistSearch, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'BLOCKED' | 'DEBT' | 'FINANCIAL_APPROVAL'>('ALL');

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
    clinicName: '',
    deliveryViaPost: false,
    priceTableId: '',
    billingLimit: 0,
    isBlocked: false,
    blockReason: '' as any,
    temporaryUnblockUntil: null as any,
    isCustomPricing: false,
    globalDiscountPercent: 0,
    customPrices: [] as any[]
  });

  const [hasBillingLimit, setHasBillingLimit] = useState(false);
  const [isInternational, setIsInternational] = useState(false);
  const [loqateSuggestions, setLoqateSuggestions] = useState<any[]>([]);
  const [isSearchingCep, setIsSearchingCep] = useState(false);

  const handleCEPBlur = async () => {
    if (!formData.cep) return;
    setIsSearchingCep(true);
    
    if (isInternational) {
        const countryCode = formData.country && formData.country !== 'Brasil' ? (formData.country.length === 2 ? formData.country.toLowerCase() : 'us') : 'us';
        const result = await searchInternationalZip(formData.cep, countryCode);
        if (result) {
            setFormData(prev => ({
                ...prev,
                city: result.city,
                state: result.state,
                country: result.country
            }));
        }
    } else {
        const result = await searchCEP(formData.cep);
        if (result) {
            setFormData(prev => ({
                ...prev,
                address: result.address,
                neighborhood: result.neighborhood,
                city: result.city,
                state: result.state
            }));
        }
    }
    setIsSearchingCep(false);
  };

  const handleLoqateSearch = async (text: string) => {
    if (text.length < 3) {
        setLoqateSuggestions([]);
        return;
    }
    const results = await searchLoqateAddress(text);
    setLoqateSuggestions(results);
  };

  const handleSelectLoqate = async (item: any) => {
      if (item.Type === 'Address') {
          const detailed = await fetchLoqateRetrieve(item.Id);
          if (detailed) {
              setFormData(prev => ({
                  ...prev,
                  address: detailed.Line1,
                  number: detailed.BuildingNumber || '',
                  neighborhood: detailed.AdminAreaName2 || '',
                  city: detailed.City,
                  state: detailed.ProvinceCode || detailed.Province,
                  cep: detailed.PostalCode,
                  country: detailed.CountryName
              }));
          }
          setLoqateSuggestions([]);
      } else {
          // It's a container (city, street etc), drill down
          const results = await searchLoqateAddress('', item.Id);
          setLoqateSuggestions(results);
      }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    const val = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    setFormData(prev => ({ ...prev, [name]: val }));
  };

  const hasPerm = (perm: PermissionKey) => {
    if (currentUser?.role === UserRole.ADMIN || currentUser?.role === UserRole.SUPER_ADMIN) return true;
    return currentUser?.permissions?.includes(perm) || false;
  };

  const handleSaveManualDentist = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!formData.name) return;
      try {
          const dataToSave: any = { ...formData };
          
          // STRICT PERMISSION CHECK
          if (!hasPerm('catalog:prices_view')) {
              delete dataToSave.priceTableId;
          }

          if (!hasPerm('clients:block_manage')) {
              delete dataToSave.isBlocked;
              delete dataToSave.billingLimit;
              delete dataToSave.blockReason;
              delete dataToSave.temporaryUnblockUntil;
          } else {
              dataToSave.billingLimit = hasBillingLimit ? formData.billingLimit : 0;
          }

          if (editingDentistId) {
              await updateManualDentist(editingDentistId, dataToSave);
          } else {
              await addManualDentist({ ...dataToSave, createdAt: new Date() });
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
      state: '', country: 'Brasil', clinicName: '', deliveryViaPost: false,
      priceTableId: '', billingLimit: 0, 
      isBlocked: false, blockReason: '' as any, temporaryUnblockUntil: null as any,
      isCustomPricing: false, globalDiscountPercent: 0, customPrices: [] as any[]
    });
    setHasBillingLimit(false);
  };

  // --- AI IMPORT LOGIC (REFINED FOR CRO) ---

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportStatus('ANALYZING');
    setIsAnalyzing(true);

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary', cellDates: true, raw: true });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws, { defval: "" });

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
                deliveryViaPost: false,
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
    const keys = Object.keys(sampleData[0] || {});
    const findExact = (target: string) => keys.find(k => k.trim().toUpperCase() === target.toUpperCase());

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const prompt = `
      Você é um especialista em mapeamento de dados odontológicos.
      Analise estas colunas da planilha: ${JSON.stringify(keys)}
      Amostra de dados para contexto: ${JSON.stringify(sampleData)}

      REGRAS CRÍTICAS DE MAPEAMENTO:
      - 'cro': Procure pela coluna chamada exatamente "CRO". Identifique-a também se os dados nela tiverem o padrão "número-UF" (ex: 2118-ES).
      - 'cpfCnpj': Coluna "Documento", "CPF" ou "CNPJ". É diferente do CRO.
      - 'name': Coluna "Nome".
      - 'email': Coluna "E-mail".
      - 'phone': Coluna "Telefone" ou "Celular".
      - 'birthDate': Coluna "Data de nascimento".
      - 'approvalDate': Coluna "Data de aprovação".
      - 'address': Coluna "Logradouro".
      - 'number': Coluna "Número".
      - 'cep': Coluna "CEP".

      RETORNE APENAS JSON PURO:
      {
        "name": "nome_exato_da_coluna",
        "cro": "nome_exato_da_coluna",
        ...
      }
    `;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: { responseMimeType: "application/json", temperature: 0 }
      });
      
      const mapping = JSON.parse(response.text || '{}');
      const exactCRO = findExact("CRO");
      if (exactCRO) mapping.cro = exactCRO;
      const exactDoc = findExact("Documento");
      if (exactDoc) mapping.cpfCnpj = exactDoc;
      return mapping;
    } catch (error) {
      return {
        name: findExact("Nome") || keys[0],
        email: findExact("E-mail") || findExact("Email") || "",
        cro: findExact("CRO") || "",
        cpfCnpj: findExact("Documento") || findExact("CPF") || findExact("CNPJ") || "",
        phone: findExact("Telefone") || findExact("Celular") || "",
        birthDate: findExact("Data de nascimento") || "",
        approvalDate: findExact("Data de aprovação") || "",
        cep: findExact("CEP") || "",
        address: findExact("Logradouro") || "",
        city: findExact("Cidade") || "",
        state: findExact("Estado") || ""
      };
    }
  };

  const saveImportedData = async () => {
    setImportStatus('SAVING');
    try {
      const validItems = importPreview.filter(p => p.isValid);
      let count = 0;
      for (const item of validItems) {
        await addManualDentist({ ...item, createdAt: new Date() });
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

  const filteredDentists = manualDentists.filter(d => {
    const matchesSearch = d.name.toLowerCase().includes(dentistSearch.toLowerCase()) || 
      (d.cro || '').includes(dentistSearch) ||
      (d.cpfCnpj || '').includes(dentistSearch);

    if (!matchesSearch) return false;

    if (statusFilter === 'ALL') return true;
    if (statusFilter === 'ACTIVE') return !d.isBlocked;
    if (statusFilter === 'BLOCKED') return d.isBlocked;
    if (statusFilter === 'DEBT') return d.isBlocked && d.blockReason === 'DEBT';
    if (statusFilter === 'FINANCIAL_APPROVAL') return d.isBlocked && d.blockReason === 'FINANCIAL_APPROVAL';

    return true;
  });

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-left-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">Clientes Internos (Offline)</h3>
            <div className="flex gap-2 w-full md:w-auto">
                <button onClick={() => setIsImportModalOpen(true)} className="flex-1 md:flex-none px-4 py-2 bg-indigo-50 text-indigo-700 font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-indigo-100 transition-all border border-indigo-200">
                    <FileSpreadsheet size={18}/> Importar Planilha
                </button>
                <button onClick={() => { resetForm(); setIsAddingDentist(true); }} className="flex-1 md:flex-none px-4 py-2 bg-blue-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg hover:bg-blue-700 transition-all">
                    <Plus size={20}/> Novo Cadastro
                </button>
            </div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
            <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-3 text-slate-400" size={18} />
                    <input 
                        placeholder="Filtrar por nome, CRO ou documento..." 
                        className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium" 
                        value={dentistSearch} 
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex items-center gap-2">
                    <select 
                        value={statusFilter}
                        onChange={e => setStatusFilter(e.target.value as any)}
                        className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-bold bg-white text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 min-w-[200px]"
                    >
                        <option value="ALL">Todos os Clientes</option>
                        <option value="ACTIVE">Clientes Ativos</option>
                        <option value="BLOCKED">Todos os Bloqueados</option>
                        <option value="DEBT">Por Inadimplência</option>
                        <option value="FINANCIAL_APPROVAL">Por Análise de Crédito</option>
                    </select>
                </div>
            </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-xs font-bold text-slate-500 uppercase border-b">
                  <tr>
                    <th className="p-4">Nome / Clínica</th>
                    <th className="p-4">Documento / CRO</th>
                    <th className="p-4">Logística</th>
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
                        <td className="p-4">
                          <div className="flex flex-col gap-1">
                            <span className="text-[10px] font-medium text-slate-600 truncate">{dentist.city ? `${dentist.city}/${dentist.state}` : '---'}</span>
                            {dentist.deliveryViaPost && (
                              <span className="bg-orange-100 text-orange-700 text-[8px] font-black px-1.5 py-0.5 rounded flex items-center gap-1 w-fit uppercase">
                                <Package size={10} /> VIA CORREIOS
                              </span>
                            )}
                          </div>
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
                                    setHasBillingLimit((dentist.billingLimit || 0) > 0);
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

                      <div>
                        <div className="flex justify-between items-center mb-3 border-b border-blue-100 pb-1">
                            <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest">3. Localização e Logística</h4>
                            <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                                <button type="button" onClick={() => { setIsInternational(false); setFormData(prev => ({ ...prev, country: 'Brasil' })); }} className={`px-2 py-1 text-[8px] font-black uppercase rounded-md transition-all ${!isInternational ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}>Brasil</button>
                                <button type="button" onClick={() => { setIsInternational(true); setFormData(prev => ({ ...prev, country: '' })); }} className={`px-2 py-1 text-[8px] font-black uppercase rounded-md transition-all ${isInternational ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}>Internacional</button>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          {isInternational && (
                              <div className="md:col-span-4 relative">
                                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">Buscar Endereço (Internacional, Opcional)</label>
                                <div className="relative">
                                    <Globe className="absolute left-3 top-3 text-slate-400" size={18} />
                                    <input 
                                        placeholder="Ex: 1600 Amphitheatre Pkwy, Mountain View..." 
                                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                                        onChange={(e) => handleLoqateSearch(e.target.value)}
                                    />
                                </div>
                                {loqateSuggestions.length > 0 && (
                                    <div className="absolute z-10 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-60 overflow-y-auto">
                                        {loqateSuggestions.map((item, idx) => (
                                            <button 
                                                key={idx} 
                                                type="button"
                                                onClick={() => handleSelectLoqate(item)}
                                                className="w-full px-4 py-2 text-left hover:bg-slate-50 text-sm border-b border-slate-50 last:border-0 flex flex-col"
                                            >
                                                <span className="font-bold text-slate-700">{item.Text}</span>
                                                <span className="text-xs text-slate-400">{item.Description}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                              </div>
                          )}

                            <div className={isInternational ? 'md:col-span-1' : 'md:col-span-1'}>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">{isInternational ? 'Zip/Postal Code' : 'CEP'} {isSearchingCep && <Loader2 size={10} className="inline animate-spin text-blue-500"/>}</label>
                                <input name="cep" value={formData.cep} onChange={handleInputChange} onBlur={handleCEPBlur} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" placeholder={isInternational ? "Ex: 90210" : "00000-000"} />
                            </div>
                          <div className={isInternational ? 'md:col-span-3' : 'md:col-span-2'}>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">Logradouro</label>
                            <input name="address" value={formData.address} onChange={handleInputChange} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">{isInternational ? 'Port/Suite' : 'Número'}</label>
                            <input name="number" value={formData.number} onChange={handleInputChange} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" />
                          </div>
                          <div className="md:col-span-2">
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">Cidade</label>
                            <input name="city" value={formData.city} onChange={handleInputChange} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">{isInternational ? 'Region/State' : 'UF'}</label>
                            <input name="state" value={formData.state} onChange={handleInputChange} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" />
                          </div>
                          
                          {isInternational ? (
                              <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">País</label>
                                <input name="country" value={formData.country} onChange={handleInputChange} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" />
                              </div>
                          ) : (
                            <div className="md:col-span-1 flex flex-col justify-end">
                                <label className="flex items-center gap-2 cursor-pointer p-2 bg-orange-50 border border-orange-100 rounded-xl hover:bg-orange-100 transition-colors">
                                    <input 
                                        type="checkbox" 
                                        name="deliveryViaPost" 
                                        checked={formData.deliveryViaPost} 
                                        onChange={handleInputChange}
                                        className="w-4 h-4 rounded text-orange-600 focus:ring-orange-500" 
                                    />
                                    <span className="text-[10px] font-black text-orange-800 uppercase leading-none">Via Correios</span>
                                </label>
                            </div>
                          )}
                        </div>
                      </div>

                      <div>
                        <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-3 border-b border-blue-100 pb-1">4. Configurações Financeiras e Tabela</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {hasPerm('catalog:prices_view') && (
                            <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">Tabela de Preços Base</label>
                                <div className="relative">
                                    <Table size={16} className="absolute left-3 top-3 text-slate-400" />
                                    <select 
                                        name="priceTableId" 
                                        value={formData.priceTableId} 
                                        onChange={handleInputChange}
                                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                                    >
                                        <option value="">Tabela Padrão (Sem tabela base)</option>
                                        {priceTables.map(table => (
                                            <option key={table.id} value={table.id}>{table.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                          )}

                          <div className="flex flex-col gap-2">
                            <label className="flex items-center gap-2 cursor-pointer p-2 bg-slate-50 border border-slate-100 rounded-xl hover:border-blue-200 transition-all">
                                <input 
                                    type="checkbox" 
                                    checked={hasBillingLimit} 
                                    onChange={e => setHasBillingLimit(e.target.checked)}
                                    className="w-4 h-4 rounded text-blue-600" 
                                />
                                <span className="text-[10px] font-black text-slate-600 uppercase">Limitar Fatura</span>
                            </label>
                            
                            {hasBillingLimit && (
                                <div className="flex items-center gap-2 animate-in slide-in-from-left-2">
                                    <div className="relative flex-1">
                                        <DollarSign size={14} className="absolute left-3 top-2.5 text-slate-400" />
                                        <input 
                                            type="number"
                                            name="billingLimit"
                                            value={formData.billingLimit}
                                            onChange={handleInputChange}
                                            placeholder="Valor Limite (R$)"
                                            className="w-full pl-8 pr-4 py-2 bg-white border border-blue-200 rounded-xl font-bold text-slate-700 outline-none"
                                        />
                                    </div>
                                </div>
                            )}
                          </div>

                          {hasPerm('clients:block_manage') && (
                            <div className="md:col-span-2 space-y-4">
                                <div className={`p-4 rounded-xl border transition-all ${formData.isBlocked ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-200'}`}>
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-2">
                                            {formData.isBlocked ? <Lock size={18} className="text-red-600" /> : <Unlock size={18} className="text-green-600" />}
                                            <div>
                                                <span className="text-[12px] font-black text-slate-800 uppercase block">Status: {formData.isBlocked ? 'BLOQUEADO' : 'ATIVO'}</span>
                                                <span className="text-[10px] font-medium text-slate-500 block leading-tight">Clientes bloqueados não podem criar novos trabalhos.</span>
                                            </div>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input 
                                                type="checkbox" 
                                                name="isBlocked" 
                                                className="sr-only peer" 
                                                checked={formData.isBlocked} 
                                                onChange={handleInputChange}
                                            />
                                            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                                        </label>
                                    </div>

                                    {formData.isBlocked && (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in slide-in-from-top-2">
                                            <div>
                                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Motivo do Bloqueio</label>
                                                <select 
                                                    name="blockReason"
                                                    value={(formData as any).blockReason || ''}
                                                    onChange={handleInputChange}
                                                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none"
                                                >
                                                    <option value="">Selecione um motivo...</option>
                                                    <option value="DEBT">Inadimplência</option>
                                                    <option value="FINANCIAL_APPROVAL">Aguardando Aprovação Financeira</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Desbloqueio Temporário</label>
                                                <button 
                                                    type="button"
                                                    onClick={() => {
                                                        const tomorrow = new Date();
                                                        tomorrow.setHours(tomorrow.getHours() + 24);
                                                        setFormData(prev => ({ 
                                                            ...prev, 
                                                            temporaryUnblockUntil: tomorrow,
                                                            isBlocked: false 
                                                        }));
                                                    }}
                                                    className="w-full px-3 py-2 bg-amber-100 text-amber-700 border border-amber-200 rounded-xl text-[10px] font-black uppercase hover:bg-amber-200 transition-all"
                                                >
                                                    Liberar por 24h
                                                </button>
                                                {(formData as any).temporaryUnblockUntil && new Date((formData as any).temporaryUnblockUntil) > new Date() && (
                                                    <p className="text-[9px] text-amber-600 font-bold mt-1">
                                                        Liberado até {new Date((formData as any).temporaryUnblockUntil).toLocaleString()}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                          )}

                          <div className="md:col-span-2 flex flex-col gap-4 pt-4 border-t border-slate-100">
                             <div className="flex items-center justify-between bg-blue-50 p-4 rounded-xl border border-blue-100">
                                <div>
                                    <p className="text-xs font-black text-blue-800 uppercase">Tabela Personalizada</p>
                                    <p className="text-[10px] text-blue-600 font-bold">Ignora a tabela base e aplica descontos manuais</p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        className="sr-only peer" 
                                        checked={formData.isCustomPricing}
                                        onChange={e => setFormData(prev => ({ ...prev, isCustomPricing: e.target.checked }))}
                                    />
                                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                </label>
                             </div>

                             {formData.isCustomPricing && (
                                <div className="space-y-4 animate-in slide-in-from-top-2">
                                  <div className="bg-green-50 p-6 rounded-2xl border border-green-100">
                                      <div className="flex items-center gap-3 mb-4 text-green-800">
                                          <Percent size={24} />
                                          <h4 className="font-black uppercase tracking-widest text-sm">Desconto Global Customizado</h4>
                                      </div>
                                      <div className="flex items-center gap-4">
                                          <input 
                                              type="range" 
                                              min="0" 
                                              max="50" 
                                              value={formData.globalDiscountPercent || 0}
                                              onChange={e => setFormData(prev => ({ ...prev, globalDiscountPercent: parseInt(e.target.value) }))}
                                              className="flex-1 h-2 bg-green-200 rounded-lg appearance-none cursor-pointer accent-green-600"
                                          />
                                          <span className="font-black text-2xl text-green-700 w-16 text-right">{formData.globalDiscountPercent || 0}%</span>
                                      </div>
                                  </div>

                                  <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto pr-2">
                                      {jobTypes.map((type: any) => {
                                          const cp = formData.customPrices?.find((p: any) => p.jobTypeId === type.id);
                                          const val = cp?.discountPercent || 0;
                                          return (
                                              <div key={type.id} className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-xl">
                                                  <div className="min-w-0 flex-1">
                                                      <p className="text-xs font-bold text-slate-700 truncate">{type.name}</p>
                                                      <p className="text-[10px] text-slate-400">R$ {type.basePrice.toFixed(2)}</p>
                                                  </div>
                                                  <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg overflow-hidden shrink-0 gap-1 pr-2">
                                                      <div className="flex items-center">
                                                          <input 
                                                              type="number" 
                                                              value={cp?.discountPercent || ''}
                                                              onChange={e => {
                                                                  const newPercent = parseInt(e.target.value) || 0;
                                                                  const newCustomPrices = [...(formData.customPrices || [])];
                                                                  const idx = newCustomPrices.findIndex(p => p.jobTypeId === type.id);
                                                                  if (idx !== -1) {
                                                                      newCustomPrices[idx] = { ...newCustomPrices[idx], discountPercent: newPercent, fixedPrice: undefined };
                                                                      if (newPercent === 0 && !(newCustomPrices[idx] as any).fixedPrice) newCustomPrices.splice(idx, 1);
                                                                  } else if (newPercent > 0) {
                                                                      newCustomPrices.push({ jobTypeId: type.id, discountPercent: newPercent } as any);
                                                                  }
                                                                  setFormData(prev => ({ ...prev, customPrices: newCustomPrices }));
                                                              }}
                                                              className="w-12 px-2 py-1 text-xs font-bold text-center outline-none bg-transparent"
                                                              placeholder="0"
                                                          />
                                                          <span className="px-1 text-[10px] font-bold text-slate-400 border-l">%</span>
                                                      </div>
                                                      <div className="w-px h-4 bg-slate-200 mx-1"></div>
                                                      <div className="flex items-center">
                                                          <span className="px-1 text-[10px] font-bold text-slate-400">R$</span>
                                                          <input 
                                                              type="number" 
                                                              value={cp?.fixedPrice || ''}
                                                              onChange={e => {
                                                                  const newFixed = parseFloat(e.target.value) || 0;
                                                                  const newCustomPrices = [...(formData.customPrices || [])];
                                                                  const idx = newCustomPrices.findIndex(p => p.jobTypeId === type.id);
                                                                  if (idx !== -1) {
                                                                      newCustomPrices[idx] = { ...newCustomPrices[idx], fixedPrice: newFixed, discountPercent: undefined as any };
                                                                      if (newFixed === 0 && !(newCustomPrices[idx] as any).discountPercent) newCustomPrices.splice(idx, 1);
                                                                  } else if (newFixed > 0) {
                                                                      newCustomPrices.push({ jobTypeId: type.id, fixedPrice: newFixed } as any);
                                                                  }
                                                                  setFormData(prev => ({ ...prev, customPrices: newCustomPrices }));
                                                              }}
                                                              className="w-16 px-2 py-1 text-xs font-bold text-center outline-none bg-transparent"
                                                              placeholder="Fixo"
                                                          />
                                                      </div>
                                                  </div>
                                              </div>
                                          );
                                      })}
                                  </div>
                                </div>
                             )}
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
                    <p className="text-slate-500 text-sm font-medium">Extraímos o campo **CRO** conforme seu modelo (Ex: 2118-ES).</p>
                  </div>
                </div>
                <button onClick={() => { setIsImportModalOpen(false); setImportStatus('IDLE'); }} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><X size={28} className="text-slate-400"/></button>
              </div>

              <div className="flex-1 overflow-y-auto p-8">
                {importStatus === 'IDLE' && (
                  <div onClick={() => fileInputRef.current?.click()} className="border-4 border-dashed border-slate-200 rounded-[24px] p-20 text-center hover:border-indigo-400 hover:bg-indigo-50 transition-all cursor-pointer group">
                    <input type="file" accept=".xlsx, .xls, .csv" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
                    <UploadCloud size={48} className="mx-auto text-slate-300 mb-4 group-hover:text-indigo-500" />
                    <h3 className="text-xl font-bold text-slate-700">Selecione sua planilha com a coluna CRO</h3>
                    <p className="text-slate-400 mt-2 italic">A IA identificará o Registro Profissional automaticamente.</p>
                  </div>
                )}

                {importStatus === 'ANALYZING' && (
                  <div className="flex flex-col items-center justify-center py-24 text-center space-y-4">
                    <Loader2 size={64} className="text-indigo-600 animate-spin" />
                    <h3 className="text-xl font-black text-slate-800">Mapeando Coluna CRO...</h3>
                  </div>
                )}

                {importStatus === 'PREVIEW' && (
                  <div className="space-y-6">
                    <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100 flex items-center gap-4 text-indigo-700">
                      <BadgeCheck size={24}/> <p className="font-bold">Mapeamento concluído! Verifique os dados do **CRO** abaixo.</p>
                    </div>

                    <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm bg-white overflow-x-auto">
                      <table className="w-full text-left min-w-[1200px]">
                        <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase border-b">
                          <tr>
                            <th className="p-4">Cliente</th>
                            <th className="p-4">Documento (CPF)</th>
                            <th className="p-4">CRO Extraído</th>
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
                              <td className="p-4 text-sm text-slate-600 font-mono">{item.cpfCnpj || '---'}</td>
                              <td className="p-4">
                                {item.cro ? (
                                  <span className="bg-blue-600 text-white text-[11px] px-2 py-1 rounded font-black shadow-sm">
                                    {item.cro}
                                  </span>
                                ) : (
                                  <span className="text-slate-300 italic">Vazio na planilha</span>
                                )}
                              </td>
                              <td className="p-4 text-[10px] leading-tight text-slate-500 max-w-xs">
                                <p className="font-bold text-slate-700">{item.address}{item.number ? `, ${item.number}` : ''}</p>
                                <p>{item.neighborhood}{item.city ? ` - ${item.city}` : ''}{item.state ? `/${item.state}` : ''}</p>
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
                   <button onClick={saveImportedData} disabled={importStatus === 'SAVING'} className="px-10 py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-xl hover:bg-indigo-700 flex items-center justify-center gap-2 transition-all disabled:opacity-50">
                     {importStatus === 'SAVING' ? <Loader2 className="animate-spin" /> : <><Save size={20}/> CONFIRMAR IMPORTAÇÃO</>}
                   </button>
                 )}
              </div>
            </div>
          </div>
        )}
    </div>
  );
};
