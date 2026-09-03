
import React, { useState, useRef, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { ManualDentist, UserRole, PermissionKey } from '../../types';
import { 
  Plus, Search, Edit, Trash2, X, Stethoscope, 
  FileSpreadsheet, UploadCloud, Loader2, Sparkles, Check, Save, BadgeCheck, Phone, Mail, MapPin, Calendar, Globe, Hash, Truck, Package, DollarSign, Lock, Unlock, Table, Percent, Link2,
  AlertTriangle, AlertCircle, CheckCircle2, Filter, MinusCircle
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { GoogleGenAI } from "@google/genai";
import { searchCEP, searchLoqateAddress, fetchLoqateRetrieve, searchInternationalZip } from '../../services/addressService';
import { matchesSearchQuery } from '../../utils/stringUtils';

export interface DentistCompletenessResult {
  isIncomplete: boolean;
  missingLabels: string[];
  missingKeys: string[];
  hasCpfCnpj: boolean;
  hasCro: boolean;
  hasAddress: boolean;
  hasEmail: boolean;
  hasPhone: boolean;
  completedCount: number;
  totalCount: number;
  percentage: number;
}

export const checkDentistCompleteness = (dentist: any): DentistCompletenessResult => {
  const missingLabels: string[] = [];
  const missingKeys: string[] = [];

  const hasCpfCnpj = Boolean(dentist?.cpfCnpj && String(dentist.cpfCnpj).trim() !== '');
  const hasCro = Boolean(dentist?.cro && String(dentist.cro).trim() !== '');
  const hasAddress = Boolean(
    (dentist?.address && String(dentist.address).trim() !== '') ||
    (dentist?.cep && String(dentist.cep).trim() !== '' && dentist?.city && String(dentist.city).trim() !== '')
  );
  const hasEmail = Boolean(dentist?.email && String(dentist.email).trim() !== '');
  const hasPhone = Boolean(
    (dentist?.phone && String(dentist.phone).trim() !== '') ||
    (dentist?.whatsapp && String(dentist.whatsapp).trim() !== '')
  );

  if (!hasCpfCnpj) {
    missingKeys.push('cpfCnpj');
    missingLabels.push('CPF/CNPJ');
  }
  if (!hasCro) {
    missingKeys.push('cro');
    missingLabels.push('CRO');
  }
  if (!hasAddress) {
    missingKeys.push('address');
    missingLabels.push('Endereço');
  }
  if (!hasEmail) {
    missingKeys.push('email');
    missingLabels.push('E-mail');
  }
  if (!hasPhone) {
    missingKeys.push('phone');
    missingLabels.push('Telefone');
  }

  const totalCount = 5;
  const completedCount = totalCount - missingKeys.length;
  const percentage = Math.round((completedCount / totalCount) * 100);

  return {
    isIncomplete: missingKeys.length > 0,
    missingLabels,
    missingKeys,
    hasCpfCnpj,
    hasCro,
    hasAddress,
    hasEmail,
    hasPhone,
    completedCount,
    totalCount,
    percentage
  };
};

export const DentistsTab = () => {
  const { manualDentists, addManualDentist, updateManualDentist, deleteManualDentist, priceTables, currentUser, jobTypes } = useApp();
  const [isAddingDentist, setIsAddingDentist] = useState(false);
  const [editingDentistId, setEditingDentistId] = useState<string | null>(null);
  const [dentistSearch, setSearchTerm] = useState('');
  const [priceTableFilter, setPriceTableFilter] = useState<string>('ALL');
  const [customPricingFilter, setCustomPricingFilter] = useState<'ALL' | 'CUSTOM' | 'NOT_CUSTOM'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'BLOCKED' | 'DEBT' | 'FINANCIAL_APPROVAL'>('ALL');
  const [completenessFilter, setCompletenessFilter] = useState<'ALL' | 'INCOMPLETE' | 'COMPLETE' | 'MISSING_CPF' | 'MISSING_CRO' | 'MISSING_ADDRESS' | 'MISSING_EMAIL' | 'MISSING_PHONE'>('ALL');

  // AI Import States
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [importPreview, setImportPreview] = useState<any[]>([]);
  const [importStatus, setImportStatus] = useState<'IDLE' | 'ANALYZING' | 'PREVIEW' | 'SAVING'>('IDLE');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form State
    const [isAddingSubDentist, setIsAddingSubDentist] = useState(false);
  const [editingSubDentistIndex, setEditingSubDentistIndex] = useState<number | null>(null);
  const defaultSubDentist = {
      id: '', name: '', email: '', phone: '', cpfCnpj: '', cro: '',
      birthDate: '', approvalDate: '', cep: '', address: '',
      number: '', complement: '', neighborhood: '', city: '',
      state: '', country: 'Brasil', clinicName: '', clientType: 'PESSOA_FISICA' as any, deliveryViaPost: false,
      priceTableId: '', billingLimit: 0, 
      isBlocked: false, blockReason: '' as any, temporaryUnblockUntil: null as any,
      isCustomPricing: false, globalDiscountPercent: 0, customPrices: [] as any[], subDentists: [] as any[]
  };
  const [subDentistFormData, setSubDentistFormData] = useState<any>(defaultSubDentist);

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
    state: '', subDentists: [] as any[],
    country: 'Brasil',
    clinicName: '',
    clientType: 'CLINICA' as any,
    deliveryViaPost: false,
    priceTableId: priceTables.find(t => t.isDefault)?.id || '',
    billingLimit: 0,
    isBlocked: false,
    blockReason: '' as any,
    temporaryUnblockUntil: null as any,
    isCustomPricing: false,
    globalDiscountPercent: 0,
    customPrices: [] as any[],
    technicalManagerName: '',
    technicalManagerEmail: '',
    technicalManagerCpf: '',
    technicalManagerCro: ''
  });

  const [hasBillingLimit, setHasBillingLimit] = useState(false);
  const [isInternational, setIsInternational] = useState(false);
  const [loqateSuggestions, setLoqateSuggestions] = useState<any[]>([]);
  const [isSearchingCep, setIsSearchingCep] = useState(false);
  const [showTechnicalManager, setShowTechnicalManager] = useState(false);

  const isAdmin = currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'ADMIN' || currentUser?.role === 'MANAGER';
  const canCreate = isAdmin || currentUser?.permissions?.includes('clients:create');
  const canEdit = isAdmin || currentUser?.permissions?.includes('clients:edit');
  const canDelete = isAdmin || currentUser?.permissions?.includes('clients:delete');
  const canBlock = isAdmin || currentUser?.permissions?.includes('clients:block_manage');

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

  
  const handleSubDentistInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setSubDentistFormData((prev: any) => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const handleSaveSubDentist = () => {
      const newSub = { ...subDentistFormData };
      if (!newSub.id) newSub.id = Math.random().toString(36).substring(2, 9);
      
      setFormData(prev => {
          const subs = [...(prev.subDentists || [])];
          if (editingSubDentistIndex !== null) {
              subs[editingSubDentistIndex] = newSub;
          } else {
              subs.push(newSub);
          }
          return { ...prev, subDentists: subs };
      });
      setIsAddingSubDentist(false);
      setEditingSubDentistIndex(null);
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

          if (dataToSave.isCustomPricing) {
              dataToSave.customPrices = (dataToSave.customPrices || []).filter((p: any) => {
                  const hasFixed = p.fixedPrice !== undefined && p.fixedPrice !== null && p.fixedPrice > 0;
                  const hasDiscount = p.discountPercent !== undefined && p.discountPercent !== null && p.discountPercent > 0;
                  const hasVars = p.variations && Object.keys(p.variations).length > 0;
                  return hasFixed || hasDiscount || hasVars;
              });
          } else {
              dataToSave.customPrices = [];
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
      state: '', subDentists: [] as any[], country: 'Brasil', clinicName: '', clientType: 'CLINICA' as any, deliveryViaPost: false,
      priceTableId: priceTables.find(t => t.isDefault)?.id || '', billingLimit: 0, 
      isBlocked: false, blockReason: '' as any, temporaryUnblockUntil: null as any,
      isCustomPricing: false, globalDiscountPercent: 0, customPrices: [] as any[],
      technicalManagerName: '', technicalManagerEmail: '', technicalManagerCpf: '', technicalManagerCro: ''
    });
    setHasBillingLimit(false);
    setShowTechnicalManager(false);
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

  const completenessStats = useMemo(() => {
    const total = manualDentists.length;
    let incompleteCount = 0;
    let missingCpfCount = 0;
    let missingCroCount = 0;
    let missingAddressCount = 0;
    let missingEmailCount = 0;
    let missingPhoneCount = 0;

    manualDentists.forEach(d => {
      const comp = checkDentistCompleteness(d);
      if (comp.isIncomplete) incompleteCount++;
      if (!comp.hasCpfCnpj) missingCpfCount++;
      if (!comp.hasCro) missingCroCount++;
      if (!comp.hasAddress) missingAddressCount++;
      if (!comp.hasEmail) missingEmailCount++;
      if (!comp.hasPhone) missingPhoneCount++;
    });

    const completeCount = total - incompleteCount;
    return {
      total,
      incompleteCount,
      completeCount,
      missingCpfCount,
      missingCroCount,
      missingAddressCount,
      missingEmailCount,
      missingPhoneCount
    };
  }, [manualDentists]);

  const filteredDentists = useMemo(() => {
    return manualDentists.filter(d => {
      const comp = checkDentistCompleteness(d);

      const matchesSearch = matchesSearchQuery(
        dentistSearch,
        d.name,
        d.cro,
        d.cpfCnpj,
        d.clinicName,
        d.email,
        d.phone,
        d.whatsapp,
        d.city,
        d.address
      );

      if (!matchesSearch) return false;

      // Completeness Filter
      if (completenessFilter === 'INCOMPLETE' && !comp.isIncomplete) return false;
      if (completenessFilter === 'COMPLETE' && comp.isIncomplete) return false;
      if (completenessFilter === 'MISSING_CPF' && !comp.missingKeys.includes('cpfCnpj')) return false;
      if (completenessFilter === 'MISSING_CRO' && !comp.missingKeys.includes('cro')) return false;
      if (completenessFilter === 'MISSING_ADDRESS' && !comp.missingKeys.includes('address')) return false;
      if (completenessFilter === 'MISSING_EMAIL' && !comp.missingKeys.includes('email')) return false;
      if (completenessFilter === 'MISSING_PHONE' && !comp.missingKeys.includes('phone')) return false;

      // Status Filter
      if (statusFilter === 'ACTIVE' && d.isBlocked) return false;
      if (statusFilter === 'BLOCKED' && !d.isBlocked) return false;
      if (statusFilter === 'DEBT' && (!d.isBlocked || d.blockReason !== 'DEBT')) return false;
      if (statusFilter === 'FINANCIAL_APPROVAL' && (!d.isBlocked || d.blockReason !== 'FINANCIAL_APPROVAL')) return false;

      // Price Table Base Filter
      if (priceTableFilter !== 'ALL') {
        if (priceTableFilter === 'GENERIC' || priceTableFilter === 'NONE') {
          if (d.priceTableId) return false;
        } else {
          if (d.priceTableId !== priceTableFilter) return false;
        }
      }

      // Custom Pricing Filter on top of base table
      if (customPricingFilter !== 'ALL') {
        const isCustom = Boolean(d.isCustomPricing || (d.customPrices && d.customPrices.length > 0));
        if (customPricingFilter === 'CUSTOM' && !isCustom) return false;
        if (customPricingFilter === 'NOT_CUSTOM' && isCustom) return false;
      }

      return true;
    });
  }, [manualDentists, dentistSearch, completenessFilter, statusFilter, priceTableFilter, customPricingFilter]);

  const formCompleteness = useMemo(() => {
    return checkDentistCompleteness(formData);
  }, [formData]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-left-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
                <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">Clientes Internos (Offline)</h3>
                <p className="text-xs text-slate-500 font-medium">Cadastre e monitore a completude cadastral dos dentistas e clínicas do laboratório.</p>
            </div>
            <div className="flex gap-2 w-full md:w-auto">
                {canCreate && (
                    <button onClick={() => setIsImportModalOpen(true)} className="flex-1 md:flex-none px-4 py-2 bg-indigo-50 text-indigo-700 font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-indigo-100 transition-all border border-indigo-200 cursor-pointer">
                        <FileSpreadsheet size={18}/> Importar Planilha
                    </button>
                )}
                {canCreate && (
                    <button onClick={() => { resetForm(); setIsAddingDentist(true); }} className="flex-1 md:flex-none px-4 py-2 bg-blue-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg hover:bg-blue-700 transition-all cursor-pointer">
                        <Plus size={20}/> Novo Cadastro
                    </button>
                )}
            </div>
        </div>

        {/* Quick Completeness Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
                type="button"
                onClick={() => setCompletenessFilter('ALL')}
                className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                    completenessFilter === 'ALL'
                        ? 'bg-blue-50/70 border-blue-300 ring-2 ring-blue-500/20 shadow-sm'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
            >
                <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Total de Clientes</p>
                    <p className="text-2xl font-black text-slate-800 mt-0.5">{completenessStats.total}</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600">
                    <Stethoscope size={20} />
                </div>
            </button>

            <button
                type="button"
                onClick={() => setCompletenessFilter(completenessFilter === 'COMPLETE' ? 'ALL' : 'COMPLETE')}
                className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                    completenessFilter === 'COMPLETE'
                        ? 'bg-emerald-50 border-emerald-300 ring-2 ring-emerald-500/20 shadow-sm'
                        : 'bg-white border-slate-200 hover:border-emerald-200'
                }`}
            >
                <div>
                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-wider flex items-center gap-1">
                        <CheckCircle2 size={12} /> Cadastros Completos
                    </p>
                    <p className="text-2xl font-black text-emerald-700 mt-0.5">{completenessStats.completeCount}</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-emerald-100/70 flex items-center justify-center text-emerald-700 font-black text-xs">
                    {completenessStats.total > 0 ? `${Math.round((completenessStats.completeCount / completenessStats.total) * 100)}%` : '0%'}
                </div>
            </button>

            <button
                type="button"
                onClick={() => setCompletenessFilter(completenessFilter === 'INCOMPLETE' ? 'ALL' : 'INCOMPLETE')}
                className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                    completenessFilter === 'INCOMPLETE'
                        ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-500/20 shadow-sm'
                        : 'bg-white border-slate-200 hover:border-amber-200'
                }`}
            >
                <div>
                    <p className="text-[10px] font-black text-amber-600 uppercase tracking-wider flex items-center gap-1">
                        <AlertTriangle size={12} /> Cadastros Incompletos
                    </p>
                    <p className="text-2xl font-black text-amber-700 mt-0.5">{completenessStats.incompleteCount}</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-amber-100/80 flex items-center justify-center text-amber-700 font-black text-xs">
                    {completenessStats.total > 0 ? `${Math.round((completenessStats.incompleteCount / completenessStats.total) * 100)}%` : '0%'}
                </div>
            </button>
        </div>

        {/* Filter Bar */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-3">
                <div className="relative md:col-span-3">
                    <Search className="absolute left-3.5 top-3 text-slate-400" size={18} />
                    <input 
                        placeholder="Filtrar por nome, CRO, CPF/CNPJ, clínica, e-mail..." 
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-xs font-bold transition-all placeholder:text-slate-400" 
                        value={dentistSearch} 
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>

                {/* Filtro de Tabela Base */}
                <div className="md:col-span-2">
                    <select 
                        value={priceTableFilter}
                        onChange={e => setPriceTableFilter(e.target.value)}
                        className={`w-full px-3 py-2.5 border rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
                            priceTableFilter !== 'ALL' 
                                ? 'bg-blue-50 border-blue-300 text-blue-900 font-black' 
                                : 'bg-white border-slate-200 text-slate-700'
                        }`}
                        title="Tabela de Preços Base"
                    >
                        <option value="ALL">Tabela Base: Todas</option>
                        <option value="GENERIC">🏛️ Tabela Genérica</option>
                        {priceTables.length > 0 && (
                            <optgroup label="Tabelas Cadastradas">
                                {priceTables.map(t => (
                                    <option key={t.id} value={t.id}>{t.name}</option>
                                ))}
                            </optgroup>
                        )}
                    </select>
                </div>

                {/* Filtro de Personalização de Preço */}
                <div className="md:col-span-2">
                    <select 
                        value={customPricingFilter}
                        onChange={e => setCustomPricingFilter(e.target.value as any)}
                        className={`w-full px-3 py-2.5 border rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all ${
                            customPricingFilter !== 'ALL' 
                                ? 'bg-indigo-50 border-indigo-300 text-indigo-900 font-black' 
                                : 'bg-white border-slate-200 text-slate-700'
                        }`}
                        title="Personalização em cima da tabela base"
                    >
                        <option value="ALL">Personalização: Todas</option>
                        <option value="CUSTOM">🏷️ Preço Personalizado</option>
                        <option value="NOT_CUSTOM">📋 Sem Personalização</option>
                    </select>
                </div>

                <div className="md:col-span-3">
                    <select 
                        value={completenessFilter}
                        onChange={e => setCompletenessFilter(e.target.value as any)}
                        className={`w-full px-3 py-2.5 border rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
                            completenessFilter !== 'ALL' 
                                ? 'bg-amber-50/60 border-amber-300 text-amber-900 font-black' 
                                : 'bg-white border-slate-200 text-slate-700'
                        }`}
                    >
                        <option value="ALL">Status de Cadastro: Todos ({completenessStats.total})</option>
                        <option value="INCOMPLETE">⚠️ Cadastros Incompletos ({completenessStats.incompleteCount})</option>
                        <option value="COMPLETE">✅ Cadastros 100% Completos ({completenessStats.completeCount})</option>
                        <option value="MISSING_CPF">Falta CPF/CNPJ ({completenessStats.missingCpfCount})</option>
                        <option value="MISSING_CRO">Falta CRO ({completenessStats.missingCroCount})</option>
                        <option value="MISSING_ADDRESS">Falta Endereço ({completenessStats.missingAddressCount})</option>
                        <option value="MISSING_EMAIL">Falta E-mail ({completenessStats.missingEmailCount})</option>
                        <option value="MISSING_PHONE">Falta Telefone ({completenessStats.missingPhoneCount})</option>
                    </select>
                </div>

                <div className="md:col-span-2">
                    <select 
                        value={statusFilter}
                        onChange={e => setStatusFilter(e.target.value as any)}
                        className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-xs font-bold bg-white text-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="ALL">Status: Todos</option>
                        <option value="ACTIVE">Clientes Ativos</option>
                        <option value="BLOCKED">Todos Bloqueados</option>
                        <option value="DEBT">Inadimplência</option>
                        <option value="FINANCIAL_APPROVAL">Em Análise</option>
                    </select>
                </div>
            </div>

            {(completenessFilter !== 'ALL' || priceTableFilter !== 'ALL' || customPricingFilter !== 'ALL' || statusFilter !== 'ALL' || Boolean(dentistSearch.trim())) && (
                <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs flex-wrap gap-2">
                    <div className="flex items-center gap-2 text-slate-700 font-bold flex-wrap">
                        <Filter size={14} className="text-blue-600 shrink-0" />
                        <span>Filtros ativos:</span>
                        {priceTableFilter !== 'ALL' && (
                            <span className="bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-lg text-[11px] font-extrabold">
                                Base: {priceTableFilter === 'GENERIC' ? 'Tabela Genérica' : (priceTables.find(t => t.id === priceTableFilter)?.name || priceTableFilter)}
                            </span>
                        )}
                        {customPricingFilter !== 'ALL' && (
                            <span className="bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-lg text-[11px] font-extrabold">
                                {customPricingFilter === 'CUSTOM' ? 'Preços Personalizados' : 'Sem Personalização'}
                            </span>
                        )}
                        {completenessFilter !== 'ALL' && (
                            <span className="bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-lg text-[11px] font-extrabold">
                                Cadastro: {
                                    completenessFilter === 'INCOMPLETE' ? 'Incompletos' :
                                    completenessFilter === 'COMPLETE' ? 'Completos' :
                                    completenessFilter === 'MISSING_CPF' ? 'Falta CPF/CNPJ' :
                                    completenessFilter === 'MISSING_CRO' ? 'Falta CRO' :
                                    completenessFilter === 'MISSING_ADDRESS' ? 'Falta Endereço' :
                                    completenessFilter === 'MISSING_EMAIL' ? 'Falta E-mail' : 'Falta Telefone'
                                }
                            </span>
                        )}
                        {statusFilter !== 'ALL' && (
                            <span className="bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 rounded-lg text-[11px] font-extrabold">
                                Status: {
                                    statusFilter === 'ACTIVE' ? 'Ativos' :
                                    statusFilter === 'BLOCKED' ? 'Bloqueados' :
                                    statusFilter === 'DEBT' ? 'Inadimplência' : 'Análise'
                                }
                            </span>
                        )}
                        <span className="text-slate-500 font-medium">({filteredDentists.length} clientes encontrados)</span>
                    </div>
                    <button 
                        type="button" 
                        onClick={() => {
                            setCompletenessFilter('ALL');
                            setPriceTableFilter('ALL');
                            setCustomPricingFilter('ALL');
                            setStatusFilter('ALL');
                            setSearchTerm('');
                        }}
                        className="text-blue-600 hover:text-blue-800 font-black uppercase text-[10px] cursor-pointer"
                    >
                        Limpar Filtros
                    </button>
                </div>
            )}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="px-6 py-3 border-b border-slate-100 flex items-center justify-between text-xs text-slate-400 font-bold">
                <span>Mostrando {filteredDentists.length} de {manualDentists.length} cliente(s)</span>
                {completenessStats.incompleteCount > 0 && (
                    <span className="text-amber-600 flex items-center gap-1 font-black text-[11px]">
                        <AlertTriangle size={13} /> {completenessStats.incompleteCount} cliente(s) precisam de complemento cadastral
                    </span>
                )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-xs font-bold text-slate-500 uppercase border-b">
                  <tr>
                    <th className="p-4">Nome / Clínica & Cadastro</th>
                    <th className="p-4">Documento / CRO</th>
                    <th className="p-4">Logística / Endereço</th>
                    <th className="p-4">Contato</th>
                    <th className="p-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredDentists.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-12 text-center text-slate-400 italic">
                        Nenhum cliente encontrado para os filtros selecionados.
                      </td>
                    </tr>
                  ) : (
                    filteredDentists.map(dentist => {
                      const comp = checkDentistCompleteness(dentist);
                      return (
                        <tr key={dentist.id} className="hover:bg-slate-50 transition-colors group">
                          <td className="p-4">
                            <div className="font-bold text-slate-800">{dentist.name}</div>
                            <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                              <span className="text-[10px] text-slate-400 font-extrabold uppercase">{dentist.clinicName || '---'}</span>
                              {(dentist as any).userId ? (
                                <span className="bg-emerald-100 text-emerald-800 text-[8px] font-black px-1.5 py-0.5 rounded uppercase">
                                  Ativo Online
                                </span>
                              ) : (
                                <span className="bg-amber-100 text-amber-800 text-[8px] font-black px-1.5 py-0.5 rounded uppercase">
                                  Convidar Online
                                </span>
                              )}
                            </div>

                            {/* Completeness Badge */}
                            <div className="mt-2">
                              {comp.isIncomplete ? (
                                <div className="space-y-1">
                                  <span 
                                    className="bg-amber-50 text-amber-800 border border-amber-200 text-[9px] font-black px-2 py-0.5 rounded-md inline-flex items-center gap-1 shadow-2xs"
                                    title={`Preenchido ${comp.completedCount} de 5. Pendente: ${comp.missingLabels.join(', ')}`}
                                  >
                                    <AlertTriangle size={11} className="text-amber-600 shrink-0" />
                                    Cadastro Incompleto ({comp.completedCount}/5)
                                  </span>
                                  <div className="flex items-center gap-1 flex-wrap">
                                    {comp.missingLabels.map((lbl, idx) => (
                                      <span key={idx} className="bg-rose-50 text-rose-700 text-[8px] font-black px-1.5 py-0.5 rounded border border-rose-100">
                                        Falta {lbl}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              ) : (
                                <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[9px] font-black px-2 py-0.5 rounded-md inline-flex items-center gap-1">
                                  <CheckCircle2 size={10} className="text-emerald-600 shrink-0" />
                                  Cadastro 100% Completo
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="p-4 text-xs">
                            <div className="mb-1">
                              {dentist.cpfCnpj ? (
                                <div className="font-bold text-slate-700">{dentist.cpfCnpj}</div>
                              ) : (
                                <span className="text-rose-500 font-bold italic text-[10px] flex items-center gap-1">
                                  <AlertCircle size={11} /> CPF/CNPJ pendente
                                </span>
                              )}
                            </div>
                            <div>
                              {dentist.cro ? (
                                <div className="text-[10px] text-blue-600 font-black uppercase">CRO: {dentist.cro}</div>
                              ) : (
                                <span className="text-amber-600 font-bold text-[10px] flex items-center gap-1">
                                  <AlertCircle size={11} /> CRO pendente
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="p-4">
                            <div className="flex flex-col gap-1 text-xs">
                              {dentist.address ? (
                                <span className="text-slate-700 font-medium text-[11px] leading-snug">
                                  {dentist.address}{dentist.number ? `, ${dentist.number}` : ''}{dentist.complement ? ` - ${dentist.complement}` : ''}
                                </span>
                              ) : (
                                <span className="text-amber-600 font-bold text-[10px] flex items-center gap-1">
                                  <AlertCircle size={11} /> Endereço pendente
                                </span>
                              )}

                              <div className="flex items-center gap-1.5 flex-wrap">
                                {dentist.city && (
                                  <span className="text-[10px] font-bold text-slate-400">
                                    {dentist.city}{dentist.state ? `/${dentist.state}` : ''}
                                  </span>
                                )}
                                {dentist.deliveryViaPost && (
                                  <span className="bg-orange-100 text-orange-700 text-[8px] font-black px-1.5 py-0.5 rounded flex items-center gap-1 w-fit uppercase">
                                    <Package size={10} /> VIA CORREIOS
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>

                          <td className="p-4">
                            <div className="space-y-1">
                              <div>
                                {dentist.email ? (
                                  <div className="text-xs text-slate-600 flex items-center gap-1 font-medium">
                                    <Mail size={12} className="text-slate-400 shrink-0"/> <span className="truncate max-w-[160px]">{dentist.email}</span>
                                  </div>
                                ) : (
                                  <span className="text-rose-500 font-bold text-[10px] flex items-center gap-1">
                                    <Mail size={11} className="shrink-0" /> E-mail pendente
                                  </span>
                                )}
                              </div>

                              <div>
                                {dentist.phone || dentist.whatsapp ? (
                                  <div className="text-xs font-bold text-slate-600 flex items-center gap-1">
                                    <Phone size={12} className="text-slate-400 shrink-0"/> {dentist.phone || dentist.whatsapp}
                                  </div>
                                ) : (
                                  <span className="text-rose-500 font-bold text-[10px] flex items-center gap-1">
                                    <Phone size={11} className="shrink-0" /> Telefone pendente
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>

                          <td className="p-4 text-right">
                              <div className="flex justify-end gap-2">
                                  <button onClick={() => {
                                      if (!dentist.email) {
                                          alert("Por favor, edite o cadastro deste dentista e defina um e-mail válido antes de gerar o convite de requisições.");
                                          return;
                                      }
                                      const inviteUrl = `${window.location.origin}/#/requisition-invite?orgId=${currentUser?.organizationId || ''}&dentistId=${dentist.id}`;
                                      navigator.clipboard.writeText(inviteUrl);
                                      alert(`Link de requisição online para Dr(a). ${dentist.name} copiado!\n\nLink: ${inviteUrl}`);
                                  }} title="Copiar Link para Requisição Online" className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg cursor-pointer">
                                      <Link2 size={18}/>
                                  </button>
                                  {canEdit && (
                                      <button onClick={() => {
                                          setEditingDentistId(dentist.id);
                                          setFormData({ ...dentist } as any);
                                          setHasBillingLimit((dentist.billingLimit || 0) > 0);
                                          setIsAddingDentist(true);
                                      }} title="Editar Cadastro" className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg cursor-pointer"><Edit size={18}/></button>
                                  )}
                                  {canDelete && (
                                      <button onClick={() => deleteManualDentist(dentist.id)} title="Excluir Cadastro" className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg cursor-pointer"><Trash2 size={18}/></button>
                                  )}
                              </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
        </div>

        {/* MODAL: CADASTRO MANUAL */}
        {isAddingDentist && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
              <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl my-auto animate-in zoom-in duration-200">
                  <div className="px-4 pb-4 sm:px-6 sm:pb-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-3xl">
                      <div>
                        <h3 className="text-xl font-black flex items-center gap-2 text-slate-800">
                          <Stethoscope className="text-blue-600" /> {editingDentistId ? 'Editar Cadastro de Cliente' : 'Ficha de Cadastro de Cliente'}
                        </h3>
                        <p className="text-xs text-slate-500 font-medium mt-0.5">Mantenha os dados atualizados para correta identificação e emissão financeira.</p>
                      </div>
                      <button onClick={() => { setIsAddingDentist(false); setEditingDentistId(null); }} className="text-slate-400 hover:text-slate-600 p-2 rounded-full hover:bg-slate-200/60 transition-colors"><X size={22}/></button>
                  </div>
                  <form onSubmit={handleSaveManualDentist} className="px-4 pb-4 sm:px-6 sm:pb-6 space-y-6 pt-4">
                      {/* Completeness Notification Banner inside Form */}
                      {formCompleteness.isIncomplete ? (
                        <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-2xl flex items-start gap-3">
                          <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={18} />
                          <div className="flex-1 text-xs">
                            <p className="font-black text-amber-900">
                              Cadastro Incompleto ({formCompleteness.completedCount} de {formCompleteness.totalCount} campos essenciais preenchidos)
                            </p>
                            <p className="text-amber-700 text-[11px] mt-0.5 leading-relaxed">
                              Campos pendentes: <strong className="font-black text-amber-900">{formCompleteness.missingLabels.join(', ')}</strong>. Preencha todos os campos destacados para completar o cadastro.
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-2xl flex items-center gap-2.5 text-xs font-bold text-emerald-800">
                          <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                          <span>Cadastro 100% Completo! Todos os dados essenciais (CPF/CNPJ, CRO, Endereço, E-mail e Telefone) foram preenchidos.</span>
                        </div>
                      )}

                      <div>
                        <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-3 border-b border-blue-100 pb-1 flex items-center justify-between">
                          <span>1. Identificação e Contato</span>
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="md:col-span-2">
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">Nome Completo *</label>
                            <input name="name" required value={formData.name} onChange={handleInputChange} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-800" />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold uppercase mb-1 ml-1 flex items-center justify-between">
                              <span className="text-slate-500">E-mail</span>
                              {!formData.email?.trim() ? (
                                <span className="text-rose-500 text-[9px] font-black bg-rose-50 px-1.5 py-0.2 rounded border border-rose-200">Pendente</span>
                              ) : (
                                <span className="text-emerald-600 text-[9px] font-black flex items-center gap-0.5"><Check size={10}/> Preenchido</span>
                              )}
                            </label>
                            <input name="email" type="email" value={formData.email} onChange={handleInputChange} placeholder="exemplo@clinica.com.br" className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-xs font-medium" />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold uppercase mb-1 ml-1 flex items-center justify-between">
                              <span className="text-slate-500">Telefone / WhatsApp</span>
                              {!formData.phone?.trim() ? (
                                <span className="text-rose-500 text-[9px] font-black bg-rose-50 px-1.5 py-0.2 rounded border border-rose-200">Pendente</span>
                              ) : (
                                <span className="text-emerald-600 text-[9px] font-black flex items-center gap-0.5"><Check size={10}/> Preenchido</span>
                              )}
                            </label>
                            <input name="phone" value={formData.phone} onChange={handleInputChange} placeholder="(00) 00000-0000" className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-xs font-medium" />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">Data de Nascimento</label>
                            <input name="birthDate" type="date" value={formData.birthDate} onChange={handleInputChange} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none text-xs font-medium" />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">Clínica</label>
                            <input name="clinicName" value={formData.clinicName} onChange={handleInputChange} placeholder="Nome do Consultório / Clínica" className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none text-xs font-medium" />
                          </div>
                          <div className="md:col-span-2">
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">Tipo de Cliente *</label>
                            <select name="clientType" value={formData.clientType || 'CLINICA'} onChange={handleInputChange} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs">
                                <option value="CLINICA">Clínica</option>
                                <option value="PESSOA_FISICA">Pessoa Física</option>
                                <option value="LABORATORIO">Laboratório</option>
                            </select>
                          </div>

                          {(formData.clientType === 'CLINICA' || formData.clientType === 'LABORATORIO') && (
                              <div className="space-y-3 col-span-1 md:col-span-2 bg-slate-50 p-4 rounded-xl border border-slate-200">
                                  <div className="flex items-center justify-between">
                                      <div>
                                          <p className="text-xs font-black text-slate-700 uppercase">Técnico Responsável</p>
                                          <p className="text-[10px] text-slate-500 font-bold">Responsável técnico vinculado à clínica ou laboratório</p>
                                      </div>
                                      {!showTechnicalManager ? (
                                          <button
                                              type="button"
                                              onClick={() => setShowTechnicalManager(true)}
                                              className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg font-bold hover:bg-blue-700 flex items-center gap-1.5 shadow-sm"
                                          >
                                              <Plus size={14} /> Adicionar Técnico Responsável
                                          </button>
                                      ) : (
                                          <button
                                              type="button"
                                              onClick={() => {
                                                  setFormData(prev => ({ ...prev, technicalManagerName: '', technicalManagerEmail: '', technicalManagerCpf: '', technicalManagerCro: '' }));
                                                  setShowTechnicalManager(false);
                                              }}
                                              className="text-xs text-red-600 hover:text-red-700 font-bold flex items-center gap-1"
                                          >
                                              <MinusCircle size={14} /> Remover Técnico
                                          </button>
                                      )}
                                  </div>

                                  {showTechnicalManager && (
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                                          <div className="space-y-1">
                                              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Nome do Técnico Responsável</label>
                                              <input 
                                                  type="text" 
                                                  name="technicalManagerName"
                                                  placeholder="Ex: Dr. Carlos Silva" 
                                                  value={formData.technicalManagerName || ''}
                                                  onChange={handleInputChange}
                                                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
                                              />
                                          </div>
                                          <div className="space-y-1">
                                              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">E-mail</label>
                                              <input 
                                                  type="email" 
                                                  name="technicalManagerEmail"
                                                  placeholder="tecnico@email.com" 
                                                  value={formData.technicalManagerEmail || ''}
                                                  onChange={handleInputChange}
                                                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
                                              />
                                          </div>
                                          <div className="space-y-1">
                                              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">CPF</label>
                                              <input 
                                                  type="text" 
                                                  name="technicalManagerCpf"
                                                  placeholder="000.000.000-00" 
                                                  value={formData.technicalManagerCpf || ''}
                                                  onChange={handleInputChange}
                                                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
                                              />
                                          </div>
                                          <div className="space-y-1">
                                              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">CRO</label>
                                              <input 
                                                  type="text" 
                                                  name="technicalManagerCro"
                                                  placeholder="CRO/UF 00000" 
                                                  value={formData.technicalManagerCro || ''}
                                                  onChange={handleInputChange}
                                                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
                                              />
                                          </div>
                                      </div>
                                  )}
                              </div>
                          )}
                        </div>
                      </div>

                      <div>
                        <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-3 border-b border-blue-100 pb-1">2. Documentação e Registro</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-[10px] font-bold uppercase mb-1 ml-1 flex items-center justify-between">
                              <span className="text-slate-500">CPF / CNPJ</span>
                              {!formData.cpfCnpj?.trim() ? (
                                <span className="text-rose-500 text-[9px] font-black bg-rose-50 px-1.5 py-0.2 rounded border border-rose-200">Pendente</span>
                              ) : (
                                <span className="text-emerald-600 text-[9px] font-black flex items-center gap-0.5"><Check size={10}/> Preenchido</span>
                              )}
                            </label>
                            <input name="cpfCnpj" value={formData.cpfCnpj} onChange={handleInputChange} placeholder="000.000.000-00" className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-xs font-medium" />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold uppercase mb-1 ml-1 flex items-center justify-between">
                              <span className="text-slate-500">CRO</span>
                              {!formData.cro?.trim() ? (
                                <span className="text-rose-500 text-[9px] font-black bg-rose-50 px-1.5 py-0.2 rounded border border-rose-200">Pendente</span>
                              ) : (
                                <span className="text-emerald-600 text-[9px] font-black flex items-center gap-0.5"><Check size={10}/> Preenchido</span>
                              )}
                            </label>
                            <input name="cro" value={formData.cro} onChange={handleInputChange} placeholder="Ex: 12345-SP" className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-xs font-medium" />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">Data Aprovação</label>
                            <input name="approvalDate" type="date" value={formData.approvalDate} onChange={handleInputChange} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none text-xs font-medium" />
                          </div>
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between items-center mb-3 border-b border-blue-100 pb-1">
                            <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-2">
                              <span>3. Localização e Logística</span>
                              {!formData.address?.trim() ? (
                                <span className="text-rose-500 text-[9px] font-black bg-rose-50 px-1.5 py-0.2 rounded border border-rose-200">Endereço Pendente</span>
                              ) : (
                                <span className="text-emerald-600 text-[9px] font-black flex items-center gap-0.5"><Check size={10}/> Preenchido</span>
                              )}
                            </h4>
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
                                <input name="cep" value={formData.cep} onChange={handleInputChange} onBlur={handleCEPBlur} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-xs font-medium" placeholder={isInternational ? "Ex: 90210" : "00000-000"} />
                            </div>
                          <div className={isInternational ? 'md:col-span-3' : 'md:col-span-2'}>
                            <label className="block text-[10px] font-bold uppercase mb-1 ml-1 flex items-center justify-between">
                              <span className="text-slate-500">Logradouro</span>
                              {!formData.address?.trim() && (
                                <span className="text-rose-500 text-[9px] font-black bg-rose-50 px-1.5 py-0.2 rounded border border-rose-200">Pendente</span>
                              )}
                            </label>
                            <input name="address" value={formData.address} onChange={handleInputChange} placeholder="Rua, Av, Travessa..." className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-xs font-medium" />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">{isInternational ? 'Port/Suite' : 'Número'}</label>
                            <input name="number" value={formData.number} onChange={handleInputChange} placeholder="Nº" className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-xs font-medium" />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">Complemento</label>
                            <input name="complement" value={formData.complement || ''} onChange={handleInputChange} placeholder="Ex: Sala 102, Apto, Bloco..." className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-xs font-medium" />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">Bairro</label>
                            <input name="neighborhood" value={formData.neighborhood || ''} onChange={handleInputChange} placeholder="Bairro" className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-xs font-medium" />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">Cidade</label>
                            <input name="city" value={formData.city} onChange={handleInputChange} placeholder="Cidade" className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-xs font-medium" />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">{isInternational ? 'Region/State' : 'UF'}</label>
                            <input name="state" value={formData.state} onChange={handleInputChange} placeholder="UF" className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-xs font-medium" />
                          </div>
                          
                          {isInternational ? (
                              <div className="md:col-span-2">
                                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">País</label>
                                <input name="country" value={formData.country} onChange={handleInputChange} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-xs font-medium" />
                              </div>
                          ) : (
                            <div className="md:col-span-4 flex flex-col justify-end">
                                <label className="flex items-center gap-2 cursor-pointer p-2.5 bg-orange-50 border border-orange-100 rounded-xl hover:bg-orange-100 transition-colors w-fit">
                                    <input 
                                        type="checkbox" 
                                        name="deliveryViaPost" 
                                        checked={formData.deliveryViaPost} 
                                        onChange={handleInputChange}
                                        className="w-4 h-4 rounded text-orange-600 focus:ring-orange-500" 
                                    />
                                    <span className="text-[10px] font-black text-orange-800 uppercase leading-none">Entrega via Correios / Transportadora</span>
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
                                        <option value="">Tabela Genérica (Padrão do Laboratório)</option>
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
                                                {(formData as any).blockReason === 'DEBT' && formData.isBlocked && (
                                                    <span className="text-[9px] font-bold text-red-500 block leading-tight mt-1">Para desbloqueio definitivo, desative ou aumente o Limite de Fatura.</span>
                                                )}
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
                                                {(() => {
                                                    const unblock = (formData as any).temporaryUnblockUntil;
                                                    if (!unblock) return null;
                                                    const unblockDate = typeof unblock.toDate === 'function' ? unblock.toDate() : new Date(unblock);
                                                    if (unblockDate > new Date()) {
                                                        return (
                                                            <p className="text-[9px] text-amber-600 font-bold mt-1">
                                                                Liberado até {unblockDate.toLocaleString()}
                                                            </p>
                                                        );
                                                    }
                                                    return null;
                                                })()}
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
                                            className="sr-only peer" 
                                        checked={formData.isCustomPricing}
                                        onChange={e => {
                                            const isChecked = e.target.checked;
                                            setFormData(prev => ({
                                                ...prev,
                                                isCustomPricing: isChecked
                                            }));
                                        }}
                                    />
                                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                </label>
                             </div>

                             {formData.isCustomPricing && (
                                <div className="space-y-4 animate-in slide-in-from-top-2">
                                  <div className="bg-green-50 p-4 sm:p-6 rounded-2xl border border-green-100">
                                      <div className="flex items-center justify-between mb-4">
                                          <div className="flex items-center gap-3 text-green-800">
                                              <Percent size={24} />
                                              <div>
                                                  <h4 className="font-black uppercase tracking-widest text-sm">Desconto Global Customizado</h4>
                                                  <p className="text-[10px] text-green-700 font-medium">Aplica-se a todos os serviços e variações sem valor fixo individual</p>
                                              </div>
                                          </div>
                                          <div className="flex items-center gap-2">
                                              <button
                                                  type="button"
                                                  onClick={() => setFormData(prev => ({ ...prev, customPrices: [] }))}
                                                  className="px-2 py-1 text-[10px] font-bold bg-white text-green-800 border border-green-200 hover:bg-green-100 rounded-lg transition-all"
                                              >
                                                  Usar Global em Todos
                                              </button>
                                              <button
                                                  type="button"
                                                  onClick={() => setFormData(prev => ({ ...prev, globalDiscountPercent: 0 }))}
                                                  className="px-2 py-1 text-[10px] font-bold bg-white text-slate-600 border border-slate-200 hover:bg-slate-100 rounded-lg transition-all"
                                              >
                                                  Zerar Global
                                              </button>
                                          </div>
                                      </div>
                                      <div className="flex items-center gap-4">
                                          <input 
                                              type="range" 
                                              min="0" 
                                              max="50" 
                                              value={formData.globalDiscountPercent || 0}
                                              onChange={e => setFormData(prev => ({ ...prev, globalDiscountPercent: parseInt(e.target.value) || 0 }))}
                                              className="flex-1 h-2 bg-green-200 rounded-lg appearance-none cursor-pointer accent-green-600"
                                          />
                                          <span className="font-black text-2xl text-green-700 w-16 text-right">{formData.globalDiscountPercent || 0}%</span>
                                      </div>
                                  </div>

                                  <div className="grid grid-cols-1 gap-2 max-h-80 overflow-y-auto pr-2">
                                      {jobTypes.map((type: any) => {
                                          const cp = formData.customPrices?.find((p: any) => p.jobTypeId === type.id);
                                          const hasCustomFixed = cp?.fixedPrice !== undefined && cp.fixedPrice !== null && cp.fixedPrice > 0;
                                          const hasCustomDiscount = cp?.discountPercent !== undefined && cp.discountPercent !== null && cp.discountPercent > 0;
                                          
                                          const assignedTable = priceTables.find(t => t.id === formData.priceTableId);
                                          const tablePriceObj = assignedTable?.prices[type.id];
                                          const basePriceForService = tablePriceObj?.basePrice !== undefined ? tablePriceObj.basePrice : type.basePrice;
                                          
                                          const effectiveServiceDiscount = hasCustomDiscount 
                                              ? cp.discountPercent 
                                              : (hasCustomFixed ? 0 : (formData.globalDiscountPercent || 0));
                                          
                                          const finalPrice = hasCustomFixed 
                                              ? cp.fixedPrice 
                                              : (basePriceForService * (1 - effectiveServiceDiscount / 100));

                                          return (
                                              <div key={type.id} className="flex flex-col p-3 bg-white border border-slate-200 rounded-xl gap-3">
                                                  <div className="flex items-center justify-between">
                                                      
                                                  <div className="min-w-0 flex-1">
                                                      <p className="text-xs font-bold text-slate-700 truncate">{type.name}</p>
                                                      <p className="text-[10px] text-slate-400">
                                                          {assignedTable ? `Tabela (${assignedTable.name}): R$ ${basePriceForService.toFixed(2)}` : `Base: R$ ${type.basePrice.toFixed(2)}`}
                                                          {effectiveServiceDiscount > 0 && !hasCustomFixed && (
                                                              <span className="ml-1 text-green-600 font-bold">
                                                                  (-{effectiveServiceDiscount}%)
                                                              </span>
                                                          )}
                                                      </p>
                                                  </div>
                                                  <div className="flex items-center gap-3">
                                                      <div className="text-right">
                                                          <p className="text-[9px] font-bold text-slate-400 uppercase">Final</p>
                                                          <p className="font-black text-xs text-blue-700">R$ {finalPrice.toFixed(2)}</p>
                                                      </div>
                                                      <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg overflow-hidden shrink-0 gap-1 pr-2">
                                                          <div className="flex items-center">
                                                              <input 
                                                                  type="number" 
                                                                  value={cp?.discountPercent !== undefined ? cp.discountPercent : ''}
                                                                  onChange={e => {
                                                                      const raw = e.target.value;
                                                                      const newPercent = raw === '' ? undefined : parseInt(raw);
                                                                      const newCustomPrices = [...(formData.customPrices || [])];
                                                                      const idx = newCustomPrices.findIndex(p => p.jobTypeId === type.id);
                                                                      if (idx !== -1) {
                                                                          if (newPercent === undefined || isNaN(newPercent)) {
                                                                              delete newCustomPrices[idx].discountPercent;
                                                                              if (!newCustomPrices[idx].fixedPrice && (!newCustomPrices[idx].variations || Object.keys(newCustomPrices[idx].variations).length === 0)) {
                                                                                  newCustomPrices.splice(idx, 1);
                                                                              }
                                                                          } else {
                                                                              newCustomPrices[idx] = { ...newCustomPrices[idx], discountPercent: newPercent, fixedPrice: undefined };
                                                                          }
                                                                      } else if (newPercent !== undefined && !isNaN(newPercent)) {
                                                                          newCustomPrices.push({ jobTypeId: type.id, discountPercent: newPercent } as any);
                                                                      }
                                                                      setFormData(prev => ({ ...prev, customPrices: newCustomPrices }));
                                                                  }}
                                                                  className="w-12 px-2 py-1 text-xs font-bold text-center outline-none bg-transparent"
                                                                  placeholder={formData.globalDiscountPercent ? `${formData.globalDiscountPercent}%` : "0"}
                                                              />
                                                              <span className="px-1 text-[10px] font-bold text-slate-400 border-l">%</span>
                                                          </div>
                                                          <div className="w-px h-4 bg-slate-200 mx-1"></div>
                                                          <div className="flex items-center">
                                                              <span className="px-1 text-[10px] font-bold text-slate-400">R$</span>
                                                              <input 
                                                                  type="number" 
                                                                  value={cp?.fixedPrice !== undefined && cp.fixedPrice > 0 ? cp.fixedPrice : ''}
                                                                  onChange={e => {
                                                                      const raw = e.target.value;
                                                                      const newFixed = raw === '' ? undefined : parseFloat(raw);
                                                                      const newCustomPrices = [...(formData.customPrices || [])];
                                                                      const idx = newCustomPrices.findIndex(p => p.jobTypeId === type.id);
                                                                      if (idx !== -1) {
                                                                          if (newFixed === undefined || isNaN(newFixed) || newFixed <= 0) {
                                                                              delete newCustomPrices[idx].fixedPrice;
                                                                              if (!newCustomPrices[idx].discountPercent && (!newCustomPrices[idx].variations || Object.keys(newCustomPrices[idx].variations).length === 0)) {
                                                                                  newCustomPrices.splice(idx, 1);
                                                                              }
                                                                          } else {
                                                                              newCustomPrices[idx] = { ...newCustomPrices[idx], fixedPrice: newFixed, discountPercent: undefined as any };
                                                                          }
                                                                      } else if (newFixed !== undefined && !isNaN(newFixed) && newFixed > 0) {
                                                                          newCustomPrices.push({ jobTypeId: type.id, fixedPrice: newFixed } as any);
                                                                      }
                                                                      setFormData(prev => ({ ...prev, customPrices: newCustomPrices }));
                                                                  }}
                                                                  className="w-16 px-2 py-1 text-xs font-bold text-center outline-none bg-transparent"
                                                                  placeholder={finalPrice.toFixed(2)}
                                                              />
                                                          </div>
                                                      </div>
                                                  </div>
                                              
                                                  </div>
                                                  {((type.variationGroups && type.variationGroups.length > 0) || (type.variations && type.variations.length > 0)) && (
                                                      <div className="pt-3 border-t border-slate-100">
                                                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-2">Variações</p>
                                                          <div className="space-y-2">
                                                              {(type.variationGroups && type.variationGroups.length > 0 ? type.variationGroups : [{ id: 'default', name: 'Opções', options: type.variations || [] }]).map((group: any) => (
                                                                  <div key={group.id} className="pl-2 border-l-2 border-slate-100">
                                                                      <p className="text-[9px] font-bold text-slate-500 mb-1">{group.name}</p>
                                                                      <div className="space-y-1">
                                                                          {group.options.map((opt: any) => {
                                                                              const tablePriceObj = assignedTable?.prices[type.id];
                                                                              const tableVariationPrice = tablePriceObj?.variations?.[opt.id];
                                                                              const baseVariationPrice = tableVariationPrice !== undefined ? tableVariationPrice : (opt.priceModifier || 0);
                                                                              const customVarPrice = cp?.variations?.[opt.id];
                                                                              
                                                                              let finalVarPrice = baseVariationPrice;
                                                                              let varDiscountInfo = '';
                                                                              if (customVarPrice !== undefined && customVarPrice !== null && !isNaN(customVarPrice)) {
                                                                                  finalVarPrice = customVarPrice;
                                                                                  varDiscountInfo = 'Personalizado';
                                                                              } else if (opt.isDiscountExempt) {
                                                                                  finalVarPrice = baseVariationPrice;
                                                                                  varDiscountInfo = 'Isento';
                                                                              } else if (effectiveServiceDiscount > 0) {
                                                                                  finalVarPrice = baseVariationPrice * (1 - effectiveServiceDiscount / 100);
                                                                                  varDiscountInfo = `-${effectiveServiceDiscount}%`;
                                                                              }

                                                                              return (
                                                                                  <div key={opt.id} className="flex items-center justify-between text-[10px]">
                                                                                      <span className="text-slate-600 truncate max-w-[150px]">
                                                                                          {opt.name}
                                                                                          <span className="text-slate-400 text-[9px] ml-1">
                                                                                              (R$ {baseVariationPrice.toFixed(2)}{varDiscountInfo ? ` → R$ ${finalVarPrice.toFixed(2)}` : ''})
                                                                                          </span>
                                                                                      </span>
                                                                                      <div className="flex items-center">
                                                                                          <span className="text-[9px] text-slate-400 pr-1">R$</span>
                                                                                          <input
                                                                                              type="number"
                                                                                              value={customVarPrice !== undefined ? customVarPrice : ''}
                                                                                              onChange={e => {
                                                                                                  const raw = e.target.value;
                                                                                                  const val = raw === '' ? undefined : parseFloat(raw);
                                                                                                  const newCustomPrices = [...(formData.customPrices || [])];
                                                                                                  let idx = newCustomPrices.findIndex((p: any) => p.jobTypeId === type.id);
                                                                                                  if (idx === -1) {
                                                                                                      idx = newCustomPrices.length;
                                                                                                      newCustomPrices.push({ jobTypeId: type.id, variations: {} } as any);
                                                                                                  }
                                                                                                  if (!(newCustomPrices[idx] as any).variations) (newCustomPrices[idx] as any).variations = {};
                                                                                                  
                                                                                                  if (val === undefined || isNaN(val)) {
                                                                                                      delete (newCustomPrices[idx] as any).variations[opt.id];
                                                                                                      if (Object.keys((newCustomPrices[idx] as any).variations).length === 0) {
                                                                                                          delete (newCustomPrices[idx] as any).variations;
                                                                                                          if (!(newCustomPrices[idx] as any).fixedPrice && !(newCustomPrices[idx] as any).discountPercent) {
                                                                                                              newCustomPrices.splice(idx, 1);
                                                                                                          }
                                                                                                      }
                                                                                                  } else {
                                                                                                      (newCustomPrices[idx] as any).variations[opt.id] = val;
                                                                                                  }
                                                                                                  setFormData(prev => ({ ...prev, customPrices: newCustomPrices }));
                                                                                              }}
                                                                                              className="w-16 px-1 py-1 text-[10px] bg-slate-50 border border-slate-200 rounded text-right outline-none focus:border-blue-400 font-bold"
                                                                                              placeholder={finalVarPrice.toFixed(2)}
                                                                                          />
                                                                                      </div>
                                                                                  </div>
                                                                              );
                                                                          })}
                                                                      </div>
                                                                  </div>
                                                              ))}
                                                          </div>
                                                      </div>
                                                  )}
                                              </div>
                                          );
                                      })}
                                  </div>
                                </div>
                             )}
                          </div>
                        </div>
                      </div>


                      {/* SUB-DENTISTS SECTION */}
                      {formData.clientType === 'CLINICA' && (
                          <div className="pt-4 border-t border-slate-100">
                              <div className="flex items-center justify-between mb-3">
                                  <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest">5. Dentistas Associados (Sub-contas)</h4>
                                  <button type="button" onClick={() => {
                                      setSubDentistFormData(defaultSubDentist);
                                      setEditingSubDentistIndex(null);
                                      setIsAddingSubDentist(true);
                                  }} className="bg-blue-100 text-blue-700 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 hover:bg-blue-200">
                                      <Plus size={14} /> Adicionar Dentista
                                  </button>
                              </div>
                              
                              {(!formData.subDentists || formData.subDentists.length === 0) ? (
                                  <div className="bg-slate-50 p-4 rounded-xl text-center text-slate-400 text-xs italic font-medium border border-slate-200">
                                      Nenhum dentista associado a esta clínica.
                                  </div>
                              ) : (
                                  <div className="space-y-2">
                                      {formData.subDentists.map((sd: any, idx: number) => (
                                          <div key={sd.id} className="flex items-center justify-between bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                                              <div>
                                                  <p className="font-bold text-slate-800 text-sm">{sd.name}</p>
                                                  <p className="text-xs text-slate-500">{sd.cro ? `CRO: ${sd.cro}` : 'Sem CRO'} | {sd.cpfCnpj || 'Sem Documento'}</p>
                                              </div>
                                              <div className="flex items-center gap-2">
                                                  <button type="button" onClick={() => {
                                                      setSubDentistFormData(sd);
                                                      setEditingSubDentistIndex(idx);
                                                      setIsAddingSubDentist(true);
                                                  }} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg">
                                                      <Edit size={16} />
                                                  </button>
                                                  <button type="button" onClick={() => {
                                                      setFormData(prev => {
                                                          const subs = [...(prev.subDentists || [])];
                                                          subs.splice(idx, 1);
                                                          return { ...prev, subDentists: subs };
                                                      });
                                                  }} className="p-2 text-red-500 hover:bg-red-50 rounded-lg">
                                                      <Trash2 size={16} />
                                                  </button>
                                              </div>
                                          </div>
                                      ))}
                                  </div>
                              )}
                          </div>
                      )}
                      
                      <button disabled={editingDentistId ? !canEdit : !canCreate} type="submit" className={`w-full py-4 font-black rounded-2xl shadow-xl transition-all transform active:scale-95 ${editingDentistId ? (canEdit ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-slate-300 text-slate-500 cursor-not-allowed') : (canCreate ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-slate-300 text-slate-500 cursor-not-allowed')}`}>SALVAR FICHA COMPLETA</button>
                  </form>
              </div>
          </div>
        )}

        {/* MODAL: IMPORTAR EXCEL IA */}
        {isImportModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
            <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in duration-300">
              <div className="px-4 pb-4 sm:px-6 sm:pb-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-lg"><Sparkles size={24} /></div>
                  <div>
                    <h2 className="text-2xl font-black text-slate-800">Agente de Importação Inteligente</h2>
                    <p className="text-slate-500 text-sm font-medium">Extraímos o campo **CRO** conforme seu modelo (Ex: 2118-ES).</p>
                  </div>
                </div>
                <button onClick={() => { setIsImportModalOpen(false); setImportStatus('IDLE'); }} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><X size={28} className="text-slate-400"/></button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 sm:p-8">
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
                                <p className="font-bold text-slate-700">{item.address}{item.number ? `, ${item.number}` : ''}{item.complement ? ` - ${item.complement}` : ''}</p>
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

              <div className="p-4 sm:p-8 bg-slate-50 border-t flex justify-between items-center">
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

        {/* MODAL: SUB-DENTISTA */}
        {isAddingSubDentist && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
              <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg my-auto animate-in zoom-in duration-200">
                  <div className="px-4 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-3xl">
                      <h3 className="text-lg font-black flex items-center gap-2 text-slate-800"><Stethoscope className="text-blue-600" /> {editingSubDentistIndex !== null ? 'Editar Dentista' : 'Novo Dentista'}</h3>
                      <button onClick={() => { setIsAddingSubDentist(false); setEditingSubDentistIndex(null); }} className="text-slate-400 hover:text-slate-600"><X size={24}/></button>
                  </div>
                  <div className="p-4 sm:p-6 space-y-4">
                      <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">Nome Completo *</label>
                          <input required name="name" value={subDentistFormData.name} onChange={handleSubDentistInputChange} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-medium" />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">CRO</label>
                              <input name="cro" value={subDentistFormData.cro} onChange={handleSubDentistInputChange} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-medium" />
                          </div>
                          <div>
                              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">CPF</label>
                              <input name="cpfCnpj" value={subDentistFormData.cpfCnpj} onChange={handleSubDentistInputChange} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-medium" />
                          </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">E-mail</label>
                              <input type="email" name="email" value={subDentistFormData.email} onChange={handleSubDentistInputChange} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-medium" />
                          </div>
                          <div>
                              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">Telefone</label>
                              <input name="phone" value={subDentistFormData.phone} onChange={handleSubDentistInputChange} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-medium" />
                          </div>
                      </div>
                  </div>
                  <div className="p-4 border-t border-slate-100 flex justify-end gap-3 bg-slate-50 rounded-b-3xl">
                      <button onClick={() => { setIsAddingSubDentist(false); setEditingSubDentistIndex(null); }} className="px-6 py-3 font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition-colors">Cancelar</button>
                      <button onClick={handleSaveSubDentist} className="px-8 py-3 bg-blue-600 text-white font-black rounded-xl shadow-lg hover:bg-blue-700 transition-all flex items-center gap-2">
                          <Save size={18} /> Salvar Dentista
                      </button>
                  </div>
              </div>
          </div>
        )}


    </div>
  );
};
