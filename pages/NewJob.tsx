
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { JobType, UserRole, JobStatus, UrgencyLevel, Job, JobItem, VariationOption, VariationGroup } from '../types';
import { BOX_COLORS } from '../services/mockData';
import { Plus, Trash2, Save, User, Box, FileText, CheckCircle, Search, RefreshCw, ArrowRight, Printer, X, FileCheck, DollarSign, Check, Calendar, AlertTriangle, Stethoscope } from 'lucide-react';

type EntryType = 'NEW' | 'CONTINUATION';

export const NewJob = () => {
  const { addJob, jobs, jobTypes, currentUser, triggerPrint, allUsers, manualDentists } = useApp();
  const navigate = useNavigate();

  // --- States ---
  const [entryType, setEntryType] = useState<EntryType>('NEW');
  const [searchParentTerm, setSearchParentTerm] = useState('');
  const [showParentSearch, setShowParentSearch] = useState(false);
  const [patientName, setPatientName] = useState('');
  const [selectedDentistId, setSelectedDentistId] = useState('');
  const [dentistName, setDentistName] = useState('');
  const [osNumber, setOsNumber] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [boxNumber, setBoxNumber] = useState('');
  const [selectedColorId, setSelectedColorId] = useState(BOX_COLORS[0].id);
  const [urgency, setUrgency] = useState<UrgencyLevel>(UrgencyLevel.NORMAL);
  const [notes, setNotes] = useState('');
  const [addedItems, setAddedItems] = useState<JobItem[]>([]);
  const [lastCreatedJob, setLastCreatedJob] = useState<Job | null>(null);

  // --- Item Builder State ---
  const [selectedTypeId, setSelectedTypeId] = useState(jobTypes[0]?.id || '');
  const [quantity, setQuantity] = useState(1);
  const [selectedVariations, setSelectedVariations] = useState<Record<string, string | string[]>>({}); 
  const [variationTextValues, setVariationTextValues] = useState<Record<string, string>>({}); 
  const [commissionDisabled, setCommissionDisabled] = useState(false);

  const connectedDentists = useMemo(() => allUsers.filter(u => u.role === UserRole.CLIENT), [allUsers]);

  // --- Derived Data & Memos ---
  const activeJobType = useMemo(() => jobTypes.find(t => t.id === selectedTypeId), [selectedTypeId, jobTypes]);

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

  const generateContinuationOs = (parentJob: Job) => {
    const baseOs = parentJob.osNumber?.split('-')[0];
    if (!baseOs) return generateNextNewOs();
    const relatedJobs = jobs.filter(j => j.osNumber?.startsWith(baseOs));
    let maxSuffix = 1;
    relatedJobs.forEach(j => {
      const parts = j.osNumber?.split('-');
      if (parts && parts.length > 1) {
        const suffix = parseInt(parts[1]);
        if (!isNaN(suffix) && suffix > maxSuffix) maxSuffix = suffix;
      }
    });
    return `${baseOs}-${maxSuffix + 1}`;
  };

  useEffect(() => {
    if (entryType === 'NEW') {
        setOsNumber(generateNextNewOs());
        setPatientName('');
        setDentistName('');
        setSelectedDentistId('');
        setNotes('');
    }
    const d = new Date();
    d.setDate(d.getDate() + 3);
    setDueDate(d.toISOString().split('T')[0]);
  }, [entryType, jobs]);

  const handleDentistSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    if (id === 'manual-type') {
      setSelectedDentistId('manual-type');
      setDentistName('');
    } else if (id.startsWith('man_dent_')) {
      const dentist = manualDentists.find(d => d.id === id);
      if (dentist) {
          setSelectedDentistId(dentist.id);
          setDentistName(dentist.name);
      }
    } else {
      const dentist = connectedDentists.find(d => d.id === id);
      if (dentist) {
        setSelectedDentistId(dentist.id);
        setDentistName(dentist.name);
      }
    }
  };

  const handleVariationChange = (group: VariationGroup, optionId: string) => {
    setSelectedVariations(prev => {
      const newSelections = { ...prev };
      const currentSelection = newSelections[group.id];
      if (group.selectionType === 'SINGLE') { newSelections[group.id] = optionId; } else { 
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
          if (value.trim().length > 0) { if (!current.includes(optionId)) { newSelections[group.id] = [...current, optionId]; } } else { newSelections[group.id] = current.filter(id => id !== optionId); }
          return newSelections;
      });
  };
  
  useEffect(() => { setSelectedVariations({}); setVariationTextValues({}); }, [selectedTypeId]);

  const handleAddItem = () => {
    if (!activeJobType) return;
    let unitPrice = activeJobType.basePrice;
    const allSelectedOptionIds = Object.values(selectedVariations).flat() as string[];
    allSelectedOptionIds.forEach(optId => { activeJobType.variationGroups.forEach(group => { const option = group.options.find(opt => opt.id === optId); if (option) { unitPrice += option.priceModifier; } }); });
    const newItem: JobItem = { id: Math.random().toString(), jobTypeId: activeJobType.id, name: activeJobType.name, quantity: quantity, price: unitPrice, selectedVariationIds: allSelectedOptionIds, variationValues: variationTextValues, commissionDisabled: commissionDisabled };
    setAddedItems([...addedItems, newItem]);
    setQuantity(1); setSelectedVariations({}); setVariationTextValues({}); setCommissionDisabled(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || addedItems.length === 0) { alert("Por favor adicione pelo menos um item."); return; }
    const totalValue = addedItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    const boxColor = BOX_COLORS.find(c => c.id === selectedColorId);
    const actionText = entryType === 'NEW' ? `Cadastro Inicial realizado por ${currentUser.name}` : `Continuação/Retorno registrada por ${currentUser.name}`;
    const newJob: Job = { id: Math.random().toString(36).substr(2, 9), organizationId: currentUser.organizationId || 'mock-org', osNumber, patientName, dentistId: selectedDentistId || 'manual-entry', dentistName: dentistName || 'Dentista Não Identificado', status: JobStatus.PENDING, urgency, items: addedItems, history: [{ id: Math.random().toString(), timestamp: new Date(), action: actionText, userId: currentUser.id, userName: currentUser.name, sector: 'Recepção' }], createdAt: new Date(), dueDate: new Date(dueDate), boxNumber, boxColor, currentSector: 'Recepção', totalValue, notes };
    addJob(newJob);
    setLastCreatedJob(newJob);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
        {lastCreatedJob && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
              <div className="bg-white rounded-2xl p-8 max-w-lg w-full text-center animate-in zoom-in duration-300">
                <CheckCircle size={56} className="mx-auto text-green-500 mb-4" />
                <h2 className="text-2xl font-bold text-slate-800">Trabalho Salvo!</h2>
                <div className="space-y-3 mt-6">
                  <button onClick={() => triggerPrint(lastCreatedJob, 'SHEET')} className="w-full p-4 flex items-center gap-3 border rounded-xl hover:bg-slate-50"><Printer /> Imprimir Ficha A4</button>
                  <button onClick={() => { setLastCreatedJob(null); navigate('/jobs'); }} className="w-full p-4 flex items-center gap-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700"><ArrowRight /> Ver Lista de Trabalhos</button>
                </div>
              </div>
            </div>
        )}

        <div><h1 className="text-2xl font-bold text-slate-900">Nova Entrada de Bancada</h1></div>
        
        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                  <h2 className="text-lg font-bold text-slate-800 mb-4">Dados do Caso</h2>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">OS #</label>
                        <input value={osNumber} onChange={e => setOsNumber(e.target.value)} className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg outline-none font-mono font-bold" />
                      </div>
                      <div className="md:col-span-2">
                         <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Paciente</label>
                         <input value={patientName} onChange={e => setPatientName(e.target.value)} required className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg outline-none" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Dentista / Cliente</label>
                      <div className="flex flex-col gap-2">
                        <select onChange={handleDentistSelect} value={selectedDentistId} className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg outline-none">
                          <option value="" disabled>Selecione um cliente...</option>
                          <optgroup label="Parceiros Online">
                            {connectedDentists.map(d => <option key={d.id} value={d.id}>{d.name} - {d.clinicName || 'Clínica'}</option>)}
                          </optgroup>
                          <optgroup label="Clientes Cadastrados (Manual)">
                            {manualDentists.map(d => <option key={d.id} value={d.id}>{d.name} - {d.clinicName || 'Manual'}</option>)}
                          </optgroup>
                          <option value="manual-type">-- Digitar Nome Manualmente --</option>
                        </select>
                        {selectedDentistId === 'manual-type' && (
                           <input value={dentistName} onChange={e => setDentistName(e.target.value)} placeholder="Digite o nome do dentista..." className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg" />
                        )}
                        <p className="text-[10px] text-slate-400">Dica: Cadastre novos clientes em Configurações > Clientes.</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                    <h2 className="text-lg font-bold text-slate-800 mb-4">Especificações</h2>
                    <div className="space-y-4 mb-6 p-4 bg-slate-50 rounded-xl border border-slate-200">
                        <div className="flex flex-col md:flex-row gap-3 items-end">
                             <div className="flex-1 w-full">
                                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Tipo de Serviço</label>
                                <select value={selectedTypeId} onChange={e => setSelectedTypeId(e.target.value)} className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg outline-none">{jobTypes.map(type => (<option key={type.id} value={type.id}>{type.name}</option>))}</select>
                            </div>
                            <div className="w-full md:w-24">
                                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Qtd</label>
                                <input type="number" min="1" value={quantity} onChange={e => setQuantity(parseInt(e.target.value))} className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg outline-none"/>
                            </div>
                        </div>
                        <button type="button" onClick={handleAddItem} className="w-full py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"><Plus size={18} /> Adicionar ao Pedido</button>
                    </div>

                    {addedItems.length > 0 && (
                      <div className="space-y-2">{addedItems.map(item => (
                        <div key={item.id} className="flex justify-between items-center p-3 border-b border-slate-100">
                          <div><p className="font-bold text-slate-800">{item.quantity}x {item.name}</p></div>
                          <div className="flex items-center gap-4"><span className="font-bold">R$ {(item.price * item.quantity).toFixed(2)}</span><button type="button" onClick={() => setAddedItems(addedItems.filter(i => i.id !== item.id))} className="text-red-400 hover:text-red-600"><Trash2 size={16}/></button></div>
                        </div>
                      ))}</div>
                    )}
                </div>
            </div>
            
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-white p-6 rounded-2xl shadow-lg border border-slate-100 sticky top-6 space-y-6">
                <div><label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Entrega</label><input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} required className="w-full px-3 py-2 border border-slate-300 rounded-lg" /></div>
                <div><label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Caixa</label><input value={boxNumber} onChange={e => setBoxNumber(e.target.value)} className="w-full text-center px-3 py-2 border border-slate-300 rounded-lg" /></div>
                <div className="border-t border-slate-200 pt-4"><button type="submit" className="w-full py-4 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 shadow-lg">Salvar Trabalho</button></div>
              </div>
            </div>
        </form>
    </div>
  );
};
