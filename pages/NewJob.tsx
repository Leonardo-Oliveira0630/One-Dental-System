
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { JobType, UserRole, JobStatus, UrgencyLevel, Job, JobItem, VariationOption, VariationGroup, JobNature, User as UserType, ManualDentist, User } from '../types';
import { getContrastColor } from '../services/mockData';
import { Plus, Trash2, Save, User as UserIcon, Box, FileText, CheckCircle, Search, RefreshCw, ArrowRight, Printer, X, FileCheck, DollarSign, Check, Calendar, AlertTriangle, Stethoscope, ChevronDown, Layers, Percent, Edit3, ShieldAlert, SearchIcon, Tag } from 'lucide-react';

type EntryType = 'NEW' | 'CONTINUATION';

export const NewJob = () => {
  const { addJob, jobs, jobTypes, currentUser, triggerPrint, allUsers, manualDentists, boxColors } = useApp();
  const navigate = useNavigate();
  const dropdownRef = useRef<HTMLDivElement>(null);

  // --- Global States ---
  const [entryType, setEntryType] = useState<EntryType>('NEW');
  const [patientName, setPatientName] = useState('');
  const [selectedDentistObj, setSelectedDentistObj] = useState<User | null>(null);
  const [selectedDentistId, setSelectedDentistId] = useState('');
  const [dentistName, setDentistName] = useState('');
  const [dentistSearchQuery, setDentistSearchQuery] = useState('');
  const [showDentistSuggestions, setShowDentistSuggestions] = useState(false);
  const [osNumber, setOsNumber] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [boxNumber, setBoxNumber] = useState('');
  const [selectedColorId, setSelectedColorId] = useState('');
  const [urgency, setUrgency] = useState<UrgencyLevel>(UrgencyLevel.NORMAL);
  const [notes, setNotes] = useState('');
  const [addedItems, setAddedItems] = useState<JobItem[]>([]);
  const [lastCreatedJob, setLastCreatedJob] = useState<Job | null>(null);

  // Define a primeira cor disponível por padrão quando a lista carregar
  useEffect(() => {
    if (boxColors.length > 0 && !selectedColorId) {
        setSelectedColorId(boxColors[0].id);
    }
  }, [boxColors]);

  // --- Item Builder State ---
  const [itemNature, setItemNature] = useState<JobNature>('NORMAL');
  const [selectedTypeId, setSelectedTypeId] = useState(jobTypes[0]?.id || '');
  const [quantity, setQuantity] = useState(1);
  const [selectedVariations, setSelectedVariations] = useState<Record<string, string | string[]>>({}); 
  const [variationTextValues, setVariationTextValues] = useState<Record<string, string>>({}); 
  const [commissionDisabled, setCommissionDisabled] = useState(false);
  
  // Price Override States
  const [manualPrice, setManualPrice] = useState<number | null>(null);
  const [discountPercent, setDiscountPercent] = useState<number>(0);

  const connectedDentists = useMemo(() => allUsers.filter(u => u.role === UserRole.CLIENT), [allUsers]);
  const activeJobType = useMemo(() => jobTypes.find(t => t.id === selectedTypeId), [selectedTypeId, jobTypes]);

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDentistSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Lista unificada e filtrada de dentistas para o Autocomplete
  const suggestions = useMemo(() => {
    if (!dentistSearchQuery) return [];
    const query = dentistSearchQuery.toLowerCase();
    
    const online = connectedDentists.map(d => ({ ...d, type: 'ONLINE' }));
    const offline = manualDentists.map(d => ({ ...d, type: 'OFFLINE' }));
    
    return [...online, ...offline].filter(d => 
        d.name.toLowerCase().includes(query) || (d.clinicName && d.clinicName.toLowerCase().includes(query))
    ).slice(0, 8); 
  }, [dentistSearchQuery, connectedDentists, manualDentists]);

  // Lógica de cálculo de preço automático considerando descontos do dentista e isenções
  const calculatedBasePrice = useMemo(() => {
    if (!activeJobType) return 0;
    
    let discountableSum = activeJobType.basePrice;
    let exemptSum = 0;

    // Processar variações selecionadas
    const allSelectedOptionIds = Object.values(selectedVariations).flat() as string[];
    allSelectedOptionIds.forEach(selectedId => {
      activeJobType.variationGroups.forEach(group => {
        const option = group.options.find(opt => opt.id === selectedId);
        if (option) {
            if (option.isDiscountExempt) exemptSum += option.priceModifier;
            else discountableSum += option.priceModifier;
        }
      });
    });

    // Determinar taxa de desconto do dentista
    let dentistDiscountRate = 0;
    if (selectedDentistObj) {
        const custom = selectedDentistObj.customPrices?.find(p => p.jobTypeId === activeJobType.id);
        if (custom) {
            if (custom.discountPercent !== undefined) {
                dentistDiscountRate = custom.discountPercent / 100;
            } else if (custom.price !== undefined) {
                // Se preço fixo na tabela, ele substitui a soma descontável
                discountableSum = custom.price;
                dentistDiscountRate = 0;
            }
        } else if (selectedDentistObj.globalDiscountPercent) {
            dentistDiscountRate = selectedDentistObj.globalDiscountPercent / 100;
        }
    }

    // Retorna a soma do que tem desconto + o que é fixo/isento
    return (discountableSum * (1 - dentistDiscountRate)) + exemptSum;
  }, [selectedVariations, activeJobType, selectedDentistObj]);

  const finalItemPrice = useMemo(() => {
    let price = manualPrice !== null ? manualPrice : calculatedBasePrice;
    if (discountPercent > 0) {
        price = price * (1 - discountPercent / 100);
    }
    return price;
  }, [calculatedBasePrice, manualPrice, discountPercent]);

  const disabledOptions = useMemo(() => {
    if (!activeJobType) return new Set<string>();
    const disabled = new Set<string>();
    const allSelectedOptionIds = Object.values(selectedVariations).flat();
    allSelectedOptionIds.forEach(selectedId => {
      activeJobType.variationGroups.forEach(group => {
        const triggeringOption = group.options.find(opt => opt.id === selectedId);
        if (triggeringOption && triggeringOption.disablesOptions) {
          triggeringOption.disablesOptions.forEach(idToDisable => { disabled.add(idToDisable); });
        }
      });
    });
    return disabled;
  }, [selectedVariations, activeJobType]);
  
  useEffect(() => {
    if (disabledOptions.size === 0) return;
    let changesMade = false;
    const newSelections = JSON.parse(JSON.stringify(selectedVariations)); 
    const newTextValues = { ...variationTextValues };
    for (const groupId in newSelections) {
      const selection = newSelections[groupId];
      if (Array.isArray(selection)) {
        const validSelections = selection.filter(optionId => !disabledOptions.has(optionId));
        if (validSelections.length !== selection.length) { newSelections[groupId] = validSelections; changesMade = true; }
      } else {
        if (disabledOptions.has(selection)) { delete newSelections[groupId]; changesMade = true; }
      }
    }
    Object.keys(newTextValues).forEach(optId => { if (disabledOptions.has(optId)) { delete newTextValues[optId]; changesMade = true; } });
    if (changesMade) { setSelectedVariations(newSelections); setVariationTextValues(newTextValues); }
  }, [disabledOptions, selectedVariations, variationTextValues]);

  const generateNextNewOs = () => {
    let maxId = 0;
    jobs.forEach(j => {
      const basePart = j.osNumber?.split('-')[0];
      const num = parseInt(basePart || '0');
      if (!isNaN(num) && num > maxId) maxId = num;
    });
    return (maxId + 1).toString().padStart(4, '0');
  };

  useEffect(() => {
    if (entryType === 'NEW') {
        setOsNumber(generateNextNewOs());
        setPatientName('');
        setDentistName('');
        setSelectedDentistId('');
        setSelectedDentistObj(null);
        setDentistSearchQuery('');
        setNotes('');
    }
    const d = new Date();
    d.setDate(d.getDate() + 3);
    setDueDate(d.toISOString().split('T')[0]);
  }, [entryType, jobs]);

  const selectDentist = (dentist: any) => {
    setSelectedDentistId(dentist.id);
    setSelectedDentistObj(dentist.type === 'ONLINE' ? dentist : null);
    setDentistName(dentist.name);
    setDentistSearchQuery(dentist.name);
    setShowDentistSuggestions(false);
  };

  const handleManualDentistEntry = () => {
    setSelectedDentistId('manual-entry');
    setSelectedDentistObj(null);
    setDentistName(dentistSearchQuery);
    setShowDentistSuggestions(false);
  };

  const handleVariationChange = (group: VariationGroup, optionId: string) => {
    setSelectedVariations(prev => {
      const newSelections = { ...prev };
      const currentSelection = newSelections[group.id];
      if (group.selectionType === 'SINGLE') { newSelections[group.id] = optionId; } 
      else { 
        const selectionArray = Array.isArray(currentSelection) ? [...currentSelection] : [];
        const index = selectionArray.indexOf(optionId);
        if (index > -1) { selectionArray.splice(index, 1); } else { selectionArray.push(optionId); }
        newSelections[group.id] = selectionArray;
      }
      return newSelections;
    });
  };

  const handleTextVariationChange = (group: VariationGroup, optionId: string, value: string) => {
      setVariationTextValues(prev => ({ ...prev, [optionId]: value }));
      setSelectedVariations(prev => {
          const newSelections = { ...prev };
          const current = (newSelections[group.id] as string[]) || [];
          if (value.trim().length > 0) { if (!current.includes(optionId)) { newSelections[group.id] = [...current, optionId]; } } 
          else { newSelections[group.id] = current.filter(id => id !== optionId); }
          return newSelections;
      });
  };
  
  useEffect(() => { 
      setSelectedVariations({}); 
      setVariationTextValues({}); 
      setManualPrice(null); 
      setDiscountPercent(0); 
      setItemNature('NORMAL');
  }, [selectedTypeId]);

  const handleAddItem = () => {
    if (!activeJobType) return;
    const allSelectedOptionIds = Object.values(selectedVariations).flat() as string[];
    
    const newItem: JobItem = { 
        id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`, 
        jobTypeId: activeJobType.id, 
        name: activeJobType.name, 
        quantity: quantity, 
        nature: itemNature,
        price: finalItemPrice, 
        selectedVariationIds: allSelectedOptionIds, 
        variationValues: variationTextValues, 
        commissionDisabled: commissionDisabled 
    };
    
    setAddedItems([...addedItems, newItem]);
    setQuantity(1); 
    setSelectedVariations({}); 
    setVariationTextValues({}); 
    setCommissionDisabled(false);
    setManualPrice(null);
    setDiscountPercent(0);
    setItemNature('NORMAL');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || addedItems.length === 0) { alert("Por favor adicione pelo menos um item."); return; }
    if (!dentistName) { alert("Por favor, identifique o dentista solicitante."); return; }
    
    const totalValue = addedItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    const boxColor = boxColors.find(c => c.id === selectedColorId);
    
    const newJob: Omit<Job, 'id' | 'organizationId'> = { 
        osNumber, 
        patientName, 
        dentistId: selectedDentistId || 'manual-entry', 
        dentistName: dentistName, 
        status: JobStatus.PENDING, 
        paymentStatus: 'PENDING', // CRÍTICO: Define como pendente de pagamento para aparecer no financeiro
        urgency, 
        items: addedItems, 
        history: [{ 
            id: Math.random().toString(), 
            timestamp: new Date(), 
            action: `Entrada Manual registrada por ${currentUser.name}`, 
            userId: currentUser.id, 
            userName: currentUser.name, 
            sector: 'Recepção' 
        }], 
        createdAt: new Date(), 
        dueDate: new Date(dueDate), 
        boxNumber, 
        boxColor, 
        currentSector: 'Recepção', 
        totalValue, 
        notes 
    };

    try {
        await addJob(newJob);
        setLastCreatedJob({ ...newJob, id: 'temp-id', organizationId: currentUser.organizationId || '' } as Job);
    } catch (err) {
        alert("Erro ao salvar trabalho.");
    }
  };

  const currentPricingStatus = useMemo(() => {
    if (!selectedDentistObj) return null;
    const hasGlobal = !!selectedDentistObj.globalDiscountPercent;
    const hasCustom = !!selectedDentistObj.customPrices?.length;
    if (hasCustom || hasGlobal) return { global: selectedDentistObj.globalDiscountPercent || 0, items: selectedDentistObj.customPrices?.length || 0 };
    return null;
  }, [selectedDentistObj]);

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20 animate-in fade-in duration-500">
        {lastCreatedJob && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
              <div className="bg-white rounded-3xl p-8 max-w-lg w-full text-center animate-in zoom-in duration-300 shadow-2xl">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle size={48} className="text-green-600" />
                </div>
                <h2 className="text-3xl font-bold text-slate-900 mb-2">Trabalho Salvo!</h2>
                <p className="text-slate-500 mb-8">A Ordem de Serviço foi gerada e está pronta para a produção.</p>
                <div className="grid grid-cols-1 gap-3">
                  <button onClick={() => { triggerPrint(lastCreatedJob, 'SHEET'); setLastCreatedJob(null); navigate('/jobs'); }} className="w-full py-4 flex items-center justify-center gap-3 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 shadow-lg transition-all"><Printer size={20} /> Imprimir Ficha de Trabalho</button>
                  <button onClick={() => { setLastCreatedJob(null); navigate('/jobs'); }} className="w-full py-4 flex items-center justify-center gap-3 border-2 border-slate-200 text-slate-700 rounded-2xl font-bold hover:bg-slate-50 transition-all"><ArrowRight size={20} /> Ver na Lista</button>
                  <button onClick={() => { setLastCreatedJob(null); setAddedItems([]); setPatientName(''); setOsNumber(generateNextNewOs()); setDentistSearchQuery(''); }} className="mt-2 text-blue-600 font-bold hover:underline">Cadastrar Outro Trabalho</button>
                </div>
              </div>
            </div>
        )}

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
                <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2"><Plus className="text-blue-600" /> Nova Entrada de Bancada</h1>
                <p className="text-slate-500">Registre trabalhos físicos recebidos no laboratório.</p>
            </div>
            <div className="flex bg-slate-200 p-1 rounded-xl">
                <button type="button" onClick={() => setEntryType('NEW')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${entryType === 'NEW' ? 'bg-white text-blue-600 shadow' : 'text-slate-500'}`}>Novo Caso</button>
                <button type="button" onClick={() => setEntryType('CONTINUATION')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${entryType === 'CONTINUATION' ? 'bg-white text-blue-600 shadow' : 'text-slate-500'}`}>Continuação/Retorno</button>
            </div>
        </div>
        
        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-8 space-y-6">
                
                {/* IDENTIFICAÇÃO */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                  <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2"><UserIcon size={18} className="text-blue-500" /> Identificação do Caso</h2>
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                    <div className="md:col-span-3">
                        <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Nº Ordem Serviço</label>
                        <input value={osNumber} onChange={e => setOsNumber(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none font-mono font-bold text-lg focus:ring-2 focus:ring-blue-500 transition-all" />
                    </div>
                    <div className="md:col-span-9">
                         <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Nome do Paciente</label>
                         <input value={patientName} onChange={e => setPatientName(e.target.value)} required placeholder="Nome Completo do Paciente" className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all" />
                    </div>
                    
                    {/* AUTOCOMPLETE DENTISTA */}
                    <div className="md:col-span-12 relative" ref={dropdownRef}>
                      <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Dentista Solicitante (Busca Instantânea)</label>
                      <div className="relative">
                        <div className="absolute left-3 top-3 text-slate-400">
                             {selectedDentistId ? <Check size={18} className="text-green-500" /> : <SearchIcon size={18} />}
                        </div>
                        <input 
                            type="text"
                            value={dentistSearchQuery}
                            onChange={e => { setDentistSearchQuery(e.target.value); setShowDentistSuggestions(true); }}
                            onFocus={() => setShowDentistSuggestions(true)}
                            placeholder="Comece a digitar o nome do dentista ou clínica..."
                            className={`w-full pl-10 pr-4 py-2.5 bg-white border rounded-xl outline-none transition-all focus:ring-2 ${selectedDentistId ? 'border-green-200 bg-green-50/30' : 'border-slate-200 focus:ring-blue-500'}`}
                        />
                        {dentistSearchQuery && (
                            <button 
                                type="button"
                                onClick={() => { setDentistSearchQuery(''); setSelectedDentistId(''); setDentistName(''); setSelectedDentistObj(null); }}
                                className="absolute right-3 top-3 text-slate-400 hover:text-red-500"
                            >
                                <X size={18} />
                            </button>
                        )}
                      </div>

                      {showDentistSuggestions && dentistSearchQuery.length > 0 && (
                          <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2">
                             <div className="max-h-60 overflow-y-auto">
                                {suggestions.map(d => (
                                    <button
                                        key={d.id}
                                        type="button"
                                        onClick={() => selectDentist(d)}
                                        className="w-full text-left p-3 hover:bg-blue-50 flex items-center justify-between border-b border-slate-50 last:border-0 transition-colors group"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-lg ${d.type === 'ONLINE' ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500'}`}>
                                                <Stethoscope size={16} />
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-800 text-sm group-hover:text-blue-700">{d.name}</p>
                                                {d.clinicName && <p className="text-[10px] text-slate-500 uppercase font-medium">{d.clinicName}</p>}
                                            </div>
                                        </div>
                                        <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${d.type === 'ONLINE' ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
                                            {d.type === 'ONLINE' ? 'SISTEMA' : 'MANUAL'}
                                        </span>
                                    </button>
                                ))}
                                <button
                                    type="button"
                                    onClick={handleManualDentistEntry}
                                    className="w-full text-left p-4 bg-slate-50 hover:bg-blue-600 hover:text-white transition-all group flex items-center gap-3 border-t border-slate-100"
                                >
                                    <div className="p-2 rounded-lg bg-white text-slate-400 group-hover:text-blue-600 shadow-sm">
                                        <Plus size={16} />
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold uppercase tracking-wider">Usar como Dentista Avulso:</p>
                                        <p className="font-black">"{dentistSearchQuery}"</p>
                                    </div>
                                </button>
                             </div>
                          </div>
                      )}
                      
                      {selectedDentistId && (
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mt-2 px-2">
                          <p className="text-[10px] font-bold text-green-600 flex items-center gap-1 animate-in slide-in-from-left-2">
                             <CheckCircle size={10} /> Dentista vinculado: <strong>{dentistName}</strong>
                          </p>
                          {currentPricingStatus && (
                              <div className="flex items-center gap-2 bg-blue-50 text-blue-700 px-2 py-0.5 rounded-lg border border-blue-100 animate-in slide-in-from-right-2">
                                  <Tag size={10}/>
                                  <span className="text-[9px] font-black uppercase tracking-tighter">Tabela Especial: {currentPricingStatus.global}% Global | {currentPricingStatus.items} itens</span>
                              </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* BUILDER DE ITENS */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                    <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2"><Layers size={18} className="text-blue-500" /> Especificações Técnicas</h2>
                    
                    <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-6">
                        {/* Natureza e Tipo */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest">Natureza deste Item:</label>
                                <div className="grid grid-cols-3 gap-2">
                                    <button type="button" onClick={() => setItemNature('NORMAL')} className={`py-2.5 rounded-lg border-2 font-bold text-xs transition-all ${itemNature === 'NORMAL' ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-400'}`}>Normal</button>
                                    <button type="button" onClick={() => setItemNature('REPETITION')} className={`py-2.5 rounded-lg border-2 font-bold text-xs transition-all ${itemNature === 'REPETITION' ? 'border-red-600 bg-red-50 text-red-700' : 'border-slate-200 bg-white text-slate-400'}`}>Repetição</button>
                                    <button type="button" onClick={() => setItemNature('ADJUSTMENT')} className={`py-2.5 rounded-lg border-2 font-bold text-xs transition-all ${itemNature === 'ADJUSTMENT' ? 'border-orange-600 bg-orange-50 text-orange-700' : 'border-slate-200 bg-white text-slate-400'}`}>Ajuste</button>
                                </div>
                            </div>
                            <div className="flex gap-4 items-end">
                                <div className="flex-1">
                                    <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Serviço</label>
                                    <select value={selectedTypeId} onChange={e => setSelectedTypeId(e.target.value)} className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold text-slate-700">
                                        {jobTypes.map(type => (<option key={type.id} value={type.id}>{type.name}</option>))}
                                    </select>
                                </div>
                                <div className="w-20">
                                    <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Qtd</label>
                                    <input type="number" min="1" value={quantity} onChange={e => setQuantity(parseInt(e.target.value) || 1)} className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl outline-none text-center font-bold" />
                                </div>
                            </div>
                        </div>

                        {/* Variações */}
                        {activeJobType && activeJobType.variationGroups && activeJobType.variationGroups.length > 0 && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-200">
                                {activeJobType.variationGroups.map(group => (
                                    <div key={group.id} className="space-y-2">
                                        <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><div className="w-1.5 h-1.5 bg-blue-400 rounded-full"></div>{group.name}</h4>
                                        <div className="flex flex-wrap gap-2">
                                            {group.options.map(option => {
                                                const isDis = disabledOptions.has(option.id);
                                                if (group.selectionType === 'TEXT') {
                                                    return (
                                                        <div key={option.id} className="w-full">
                                                            <p className="text-[10px] font-bold text-slate-400 mb-1">{option.name}</p>
                                                            <input value={variationTextValues[option.id] || ''} onChange={e => handleTextVariationChange(group, option.id, e.target.value)} placeholder="Digite..." className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white" />
                                                        </div>
                                                    );
                                                }
                                                const isSelected = group.selectionType === 'SINGLE' ? selectedVariations[group.id] === option.id : (selectedVariations[group.id] as string[] || []).includes(option.id);
                                                return (
                                                    <button key={option.id} type="button" disabled={isDis} onClick={() => handleVariationChange(group, option.id)} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${isDis ? 'opacity-20 cursor-not-allowed bg-slate-100' : isSelected ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-white text-slate-600 border-slate-200 hover:border-blue-400'}`}>
                                                        {option.name}
                                                        {option.priceModifier !== 0 && (<span className={`ml-1 text-[9px] ${isSelected ? 'text-blue-100' : 'text-green-600'}`}>{option.priceModifier > 0 ? `+R$${option.priceModifier}` : `-R$${Math.abs(option.priceModifier)}`}</span>)}
                                                        {option.isDiscountExempt && <span className="ml-1 text-[8px] px-1 bg-orange-100 text-orange-600 rounded">FIXO</span>}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Preço e Ajustes */}
                        <div className="pt-4 border-t border-slate-200 space-y-4">
                            <div className="flex justify-between items-center">
                                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><DollarSign size={14} className="text-green-600" /> Ajuste de Valor do Item</h4>
                                {selectedDentistObj && (
                                     <span className="text-[10px] font-bold text-blue-600 uppercase bg-blue-50 px-2 py-0.5 rounded">Tabela Cliente Ativa</span>
                                )}
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Preço Final Unitário (R$)</label>
                                    <div className="relative">
                                        <Edit3 size={14} className="absolute left-3 top-2.5 text-slate-400" />
                                        <input type="number" step="0.01" value={manualPrice !== null ? manualPrice : calculatedBasePrice.toFixed(2)} onChange={e => setManualPrice(parseFloat(e.target.value))} className={`w-full pl-9 pr-4 py-2 border rounded-xl font-bold focus:ring-2 outline-none transition-all ${itemNature === 'REPETITION' ? 'bg-red-50 border-red-200 text-red-700 focus:ring-red-300' : 'bg-white border-slate-200 focus:ring-blue-500'}`} />
                                    </div>
                                    {itemNature === 'REPETITION' && <p className="text-[9px] text-red-500 mt-1 font-bold italic flex items-center gap-1"><ShieldAlert size={10}/> Repetição: Defina o valor parcial ou zero.</p>}
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Desconto Extra (%)</label>
                                    <div className="relative">
                                        <Percent size={14} className="absolute left-3 top-2.5 text-slate-400" />
                                        <input type="number" max="100" min="0" value={discountPercent} onChange={e => setDiscountPercent(Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))} className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl font-bold focus:ring-2 focus:ring-blue-500 outline-none" />
                                    </div>
                                </div>
                            </div>
                            <div className="bg-blue-900/5 p-3 rounded-xl flex justify-between items-center border border-blue-100">
                                <span className="text-xs font-bold text-blue-700 uppercase">{itemNature}</span>
                                <div className="text-right">
                                    <span className="text-[10px] text-slate-400 line-through mr-2">R$ {activeJobType?.basePrice.toFixed(2)}</span>
                                    <span className="font-black text-blue-900">R$ {finalItemPrice.toFixed(2)}</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 pt-2">
                            <label className="flex items-center gap-2 cursor-pointer group">
                                <input type="checkbox" checked={commissionDisabled} onChange={e => setCommissionDisabled(e.target.checked)} className="w-5 h-5 rounded border-slate-300 text-blue-600" />
                                <span className="text-sm font-bold text-slate-600 group-hover:text-slate-900">Sem comissão para este item</span>
                            </label>
                        </div>

                        <button type="button" onClick={handleAddItem} disabled={!selectedTypeId} className="w-full py-4 bg-blue-600 text-white font-black rounded-2xl hover:bg-blue-700 active:scale-95 transition-all flex items-center justify-center gap-2 shadow-xl shadow-blue-100 disabled:opacity-50">
                            <Plus size={20} /> ADICIONAR ITEM AO PEDIDO
                        </button>
                    </div>

                    {addedItems.length > 0 && (
                      <div className="mt-6 space-y-3">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest px-2">Itens Adicionados</p>
                        {addedItems.map(item => (
                            <div key={item.id} className="flex justify-between items-center p-4 bg-white rounded-2xl border border-slate-100 shadow-sm animate-in slide-in-from-right-4 transition-all hover:border-blue-200">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center font-bold">{item.quantity}</div>
                                    <div>
                                        <p className="font-bold text-slate-800 flex items-center gap-2">
                                            {item.name}
                                            {item.nature === 'REPETITION' && <span className="px-1.5 py-0.5 bg-red-100 text-red-600 text-[9px] font-black rounded uppercase">Repetição</span>}
                                            {item.nature === 'ADJUSTMENT' && <span className="px-1.5 py-0.5 bg-orange-100 text-orange-600 text-[9px] font-black rounded uppercase">Ajuste</span>}
                                        </p>
                                        <div className="flex gap-1 flex-wrap">
                                            {item.commissionDisabled && <span className="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-bold uppercase">S/ Comissão</span>}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <span className="font-bold text-slate-700">R$ {(item.price * item.quantity).toFixed(2)}</span>
                                    <button type="button" onClick={() => setAddedItems(addedItems.filter(i => i.id !== item.id))} className="p-2 text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={20}/></button>
                                </div>
                            </div>
                        ))}
                      </div>
                    )}
                </div>
            </div>
            
            <div className="lg:col-span-4 space-y-6">
              <div className="bg-white p-6 rounded-3xl shadow-xl border border-slate-100 sticky top-6 space-y-6">
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Box size={18} className="text-blue-500" /> Logística Interna</h2>

                <div>
                    <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">Previsão de Saída</label>
                    <div className="relative">
                        <Calendar className="absolute left-3 top-3 text-slate-400" size={18} />
                        <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} required className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-700" />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">Nº Caixa</label>
                        <input value={boxNumber} onChange={e => setBoxNumber(e.target.value)} placeholder="Ex: 12" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-center font-black text-xl focus:ring-2 focus:ring-blue-500 outline-none" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">Cor da Caixa</label>
                        <div className="flex flex-wrap gap-2 justify-center">
                            {boxColors.map(color => (
                                <button 
                                  key={color.id} 
                                  type="button" 
                                  onClick={() => setSelectedColorId(color.id)} 
                                  className={`w-7 h-7 rounded-full border-2 transition-all ${selectedColorId === color.id ? 'border-slate-900 scale-125 shadow-md' : 'border-transparent opacity-60 hover:opacity-100'}`} 
                                  style={{ backgroundColor: color.hex }} 
                                  title={color.name} 
                                />
                            ))}
                        </div>
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">Prioridade</label>
                    <div className="grid grid-cols-2 gap-2">
                        <button type="button" onClick={() => setUrgency(UrgencyLevel.NORMAL)} className={`py-2 text-xs font-bold rounded-xl border-2 transition-all ${urgency === UrgencyLevel.NORMAL ? 'bg-slate-50 border-slate-300 text-slate-700' : 'border-slate-100 text-slate-400'}`}>Normal</button>
                        <button type="button" onClick={() => setUrgency(UrgencyLevel.VIP)} className={`py-2 text-xs font-bold rounded-xl border-2 transition-all ${urgency === UrgencyLevel.VIP ? 'bg-orange-50 border-orange-300 text-orange-700' : 'border-slate-100 text-slate-400'}`}>🔥 VIP/Urgente</button>
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">Observações do Caso</label>
                    <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder="Instruções gerais..." className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm resize-none" />
                </div>

                <div className="pt-6 border-t border-slate-100">
                    <div className="flex justify-between items-center mb-4">
                        <span className="text-sm font-bold text-slate-500 uppercase">Valor Total OS</span>
                        <span className="text-2xl font-black text-slate-900">R$ {addedItems.reduce((acc, i) => acc + (i.price * i.quantity), 0).toFixed(2)}</span>
                    </div>
                    <button type="submit" disabled={addedItems.length === 0} className="w-full py-5 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-black rounded-2xl hover:shadow-2xl hover:shadow-green-100 active:scale-95 transition-all shadow-xl shadow-green-50 flex items-center justify-center gap-3 disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed"><FileCheck size={24} /> FINALIZAR E SALVAR</button>
                </div>
              </div>
            </div>
        </form>
    </div>
  );
};
