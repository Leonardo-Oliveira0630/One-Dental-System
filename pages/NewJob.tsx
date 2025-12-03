import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { JobType, UserRole, JobStatus, UrgencyLevel, Job, JobItem, VariationOption, VariationGroup } from '../types';
import { BOX_COLORS } from '../services/mockData';
import { Plus, Trash2, Save, User, Box, FileText, CheckCircle, Search, RefreshCw, ArrowRight, Printer, X, FileCheck, DollarSign, Check, Calendar, AlertTriangle } from 'lucide-react';

type EntryType = 'NEW' | 'CONTINUATION';

export const NewJob = () => {
  const { addJob, jobs, jobTypes, currentUser, triggerPrint, allUsers } = useApp();
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
  const [selectedVariations, setSelectedVariations] = useState<Record<string, string | string[]>>({}); // { [groupId]: optionId | optionId[] }
  const [commissionDisabled, setCommissionDisabled] = useState(false);

  const dentists = useMemo(() => allUsers.filter(u => u.role === UserRole.CLIENT), [allUsers]);

  // --- Derived Data & Memos ---
  const activeJobType = useMemo(() => jobTypes.find(t => t.id === selectedTypeId), [selectedTypeId, jobTypes]);

  // Calculate disabled OPTIONS based on current selections
  const disabledOptions = useMemo(() => {
    if (!activeJobType) return new Set<string>();
    
    const disabled = new Set<string>();
    const allSelectedOptionIds = Object.values(selectedVariations).flat();

    allSelectedOptionIds.forEach(selectedId => {
      activeJobType.variationGroups.forEach(group => {
        const triggeringOption = group.options.find(opt => opt.id === selectedId);
        if (triggeringOption && triggeringOption.disablesOptions) {
          triggeringOption.disablesOptions.forEach(idToDisable => {
            disabled.add(idToDisable);
          });
        }
      });
    });

    return disabled;
  }, [selectedVariations, activeJobType]);
  
  // Auto-deselect options that become disabled
  useEffect(() => {
    if (disabledOptions.size === 0) return;

    let changesMade = false;
    const newSelections = JSON.parse(JSON.stringify(selectedVariations)); 

    for (const groupId in newSelections) {
      const selection = newSelections[groupId];
      if (Array.isArray(selection)) {
        const validSelections = selection.filter(optionId => !disabledOptions.has(optionId));
        if (validSelections.length !== selection.length) {
          newSelections[groupId] = validSelections;
          changesMade = true;
        }
      } else {
        if (disabledOptions.has(selection)) {
          delete newSelections[groupId];
          changesMade = true;
        }
      }
    }

    if (changesMade) {
      setSelectedVariations(newSelections);
    }
  }, [disabledOptions, selectedVariations]);

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

  const handleSelectParentJob = (parentJob: Job) => {
      setOsNumber(generateContinuationOs(parentJob));
      setPatientName(parentJob.patientName);
      setDentistName(parentJob.dentistName);
      setSelectedDentistId(parentJob.dentistId);
      setShowParentSearch(false);
  };

  const handleDentistSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    if (id === 'manual') {
      setSelectedDentistId('manual');
      setDentistName(''); // Clear for manual typing
    } else {
      const dentist = dentists.find(d => d.id === id);
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

      if (group.selectionType === 'SINGLE') {
        newSelections[group.id] = optionId;
      } else { // MULTIPLE
        const selectionArray = Array.isArray(currentSelection) ? [...currentSelection] : [];
        const index = selectionArray.indexOf(optionId);
        if (index > -1) {
          selectionArray.splice(index, 1);
        } else {
          selectionArray.push(optionId);
        }
        newSelections[group.id] = selectionArray;
      }
      return newSelections;
    });
  };
  
  useEffect(() => {
    setSelectedVariations({});
  }, [selectedTypeId]);

  const handleAddItem = () => {
    if (!activeJobType) return;
    
    let unitPrice = activeJobType.basePrice;
    const allSelectedOptionIds = Object.values(selectedVariations).flat() as string[];

    allSelectedOptionIds.forEach(optId => {
      activeJobType.variationGroups.forEach(group => {
        const option = group.options.find(opt => opt.id === optId);
        if (option) {
          unitPrice += option.priceModifier;
        }
      });
    });

    const newItem: JobItem = {
      id: Math.random().toString(),
      jobTypeId: activeJobType.id,
      name: activeJobType.name,
      quantity: quantity,
      price: unitPrice,
      selectedVariationIds: allSelectedOptionIds,
      commissionDisabled: commissionDisabled
    };

    setAddedItems([...addedItems, newItem]);
    setQuantity(1);
    setSelectedVariations({});
    setCommissionDisabled(false);
  };

  const handleRemoveItem = (id: string) => {
    setAddedItems(addedItems.filter(i => i.id !== id));
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || addedItems.length === 0) {
        alert("Por favor adicione pelo menos um item.");
        return;
    }

    const totalValue = addedItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    const boxColor = BOX_COLORS.find(c => c.id === selectedColorId);

    const actionText = entryType === 'NEW' 
        ? `Cadastro Inicial realizado por ${currentUser.name}` 
        : `Continuação/Retorno registrada por ${currentUser.name}`;

    const newJob: Job = {
      id: Math.random().toString(36).substr(2, 9),
      osNumber,
      patientName,
      dentistId: selectedDentistId || 'manual-entry', 
      dentistName: dentistName || 'Dentista Não Identificado',
      status: JobStatus.PENDING,
      urgency,
      items: addedItems,
      history: [{
        id: Math.random().toString(),
        timestamp: new Date(),
        action: actionText,
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

    addJob(newJob);
    setLastCreatedJob(newJob);
  };

  const handleFinish = () => {
    setLastCreatedJob(null);
    navigate('/jobs');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
        {/* Success Modal */}
        {lastCreatedJob && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
              <div className="bg-white rounded-2xl p-8 max-w-lg w-full text-center animate-in zoom-in duration-300">
                <CheckCircle size={56} className="mx-auto text-green-500 mb-4" />
                <h2 className="text-2xl font-bold text-slate-800">Trabalho Salvo com Sucesso!</h2>
                <p className="text-slate-500 mt-2 mb-6">OS <span className="font-bold">{lastCreatedJob.osNumber}</span> foi criada. O que deseja fazer agora?</p>
                <div className="space-y-3">
                  <button onClick={() => triggerPrint(lastCreatedJob, 'SHEET')} className="w-full p-4 flex items-center gap-3 border rounded-xl hover:bg-slate-50"><Printer /> Imprimir Ficha de Trabalho (A4)</button>
                  <button onClick={() => triggerPrint(lastCreatedJob, 'LABEL')} className="w-full p-4 flex items-center gap-3 border rounded-xl hover:bg-slate-50"><Printer /> Imprimir Etiqueta da Caixa</button>
                  <button onClick={handleFinish} className="w-full p-4 flex items-center gap-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700"><ArrowRight /> Ir para a Lista de Trabalhos</button>
                </div>
              </div>
            </div>
        )}

        {/* Header */}
        <div>
            <h1 className="text-2xl font-bold text-slate-900">Nova Entrada de Bancada</h1>
            <p className="text-slate-500">Preencha os dados para registrar um novo trabalho no sistema.</p>
        </div>
        
        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
                
                {/* DADOS DO CASO */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                  <h2 className="text-lg font-bold text-slate-800 mb-4">Dados do Caso</h2>
                  <div className="space-y-4">
                    <div className="flex bg-slate-100 p-1 rounded-lg">
                      <button type="button" onClick={() => setEntryType('NEW')} className={`flex-1 py-2 text-sm font-bold rounded-md transition-colors ${entryType === 'NEW' ? 'bg-white shadow text-slate-800' : 'text-slate-500'}`}>Novo Caso</button>
                      <button type="button" onClick={() => { setEntryType('CONTINUATION'); setShowParentSearch(true); }} className={`flex-1 py-2 text-sm font-bold rounded-md transition-colors ${entryType === 'CONTINUATION' ? 'bg-white shadow text-slate-800' : 'text-slate-500'}`}>Continuação/Ajuste</button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="md:col-span-1">
                        <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">OS #</label>
                        <input value={osNumber} onChange={e => setOsNumber(e.target.value)} className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono font-bold" />
                      </div>
                      <div className="md:col-span-2">
                         <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Paciente</label>
                         <input value={patientName} onChange={e => setPatientName(e.target.value)} required className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Dentista</label>
                      <div className="flex gap-2">
                        <select onChange={handleDentistSelect} value={selectedDentistId} className="flex-1 w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
                          <option value="" disabled>Selecione um dentista cadastrado</option>
                          {dentists.map(d => <option key={d.id} value={d.id}>{d.name} - {d.clinicName}</option>)}
                          <option value="manual">-- Digitar Manualmente --</option>
                        </select>
                        {selectedDentistId === 'manual' && (
                           <input value={dentistName} onChange={e => setDentistName(e.target.value)} placeholder="Digite o nome" className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-lg" />
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* ESPECIFICAÇÕES DO TRABALHO */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                    <h2 className="text-lg font-bold text-slate-800 mb-4">Especificações do Trabalho</h2>
                    <div className="space-y-4 mb-6 p-4 bg-slate-50 rounded-xl border border-slate-200">
                        {/* Type & Qty Selector */}
                        <div className="flex flex-col md:flex-row gap-3 items-end">
                             <div className="flex-1 w-full">
                                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Tipo de Serviço</label>
                                <select 
                                    value={selectedTypeId}
                                    onChange={e => setSelectedTypeId(e.target.value)}
                                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                >
                                    {jobTypes.map(type => (
                                        <option key={type.id} value={type.id}>{type.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="w-full md:w-24">
                                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Quantidade</label>
                                <input 
                                    type="number" min="1" value={quantity}
                                    onChange={e => setQuantity(parseInt(e.target.value))}
                                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                        </div>

                        {/* Variations Area */}
                        {activeJobType && activeJobType.variationGroups.length > 0 && (
                            <div className="pt-3 border-t border-slate-200 mt-3 space-y-4">
                                {activeJobType.variationGroups.map(group => {
                                    const allOptionsInGroupDisabled = group.options.every(opt => disabledOptions.has(opt.id));

                                    return (
                                        <div key={group.id} className={`p-3 rounded-lg border transition-all ${allOptionsInGroupDisabled ? 'bg-slate-100 opacity-50' : 'bg-white border-slate-200'}`}>
                                            <div className="flex justify-between items-center mb-2">
                                                <h4 className="font-bold text-sm text-slate-700">{group.name}</h4>
                                                <span className="text-xs font-bold bg-slate-100 px-2 py-0.5 rounded text-slate-500">
                                                    {group.selectionType === 'SINGLE' ? 'Seleção Única' : 'Múltipla Escolha'}
                                                </span>
                                            </div>
                                            <div className="space-y-2">
                                                {group.options.map(option => {
                                                    const isOptionDisabled = disabledOptions.has(option.id);
                                                    const isSelected = group.selectionType === 'SINGLE' 
                                                        ? selectedVariations[group.id] === option.id
                                                        : (selectedVariations[group.id] as string[])?.includes(option.id);
                                                    
                                                    return (
                                                        <div
                                                            key={option.id}
                                                            onClick={() => !isOptionDisabled && handleVariationChange(group, option.id)}
                                                            className={`p-2 rounded flex justify-between items-center text-sm transition-all ${isOptionDisabled ? 'cursor-not-allowed opacity-40' : 'cursor-pointer'} ${
                                                                isSelected ? 'bg-blue-50 border border-blue-300' : 'hover:bg-slate-50'
                                                            } ${isOptionDisabled && isSelected ? 'ring-2 ring-red-400' : ''}`}
                                                        >
                                                            <div className="flex items-center gap-2">
                                                                <div className={`w-4 h-4 border border-slate-300 flex items-center justify-center ${group.selectionType === 'SINGLE' ? 'rounded-full' : 'rounded'}`}>
                                                                    {isSelected && <div className="w-2 h-2 bg-blue-600 rounded-full" />}
                                                                </div>
                                                                <span className={isSelected ? 'font-bold text-blue-800' : 'text-slate-600'}>{option.name}</span>
                                                            </div>
                                                            <span className="text-xs font-semibold">{option.priceModifier > 0 ? `+ R$ ${option.priceModifier.toFixed(2)}` : ''}</span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        <div className="flex items-center gap-2 pt-2 border-t border-slate-200 mt-2">
                            <input 
                                type="checkbox" id="commissionDisable"
                                checked={commissionDisabled} onChange={(e) => setCommissionDisabled(e.target.checked)}
                                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                            />
                            <label htmlFor="commissionDisable" className="text-sm text-slate-600 select-none cursor-pointer flex items-center gap-1">
                                <DollarSign size={14} className="text-slate-400"/>
                                Isentar Comissão (Repetição/Garantia)
                            </label>
                        </div>

                        <button type="button" onClick={handleAddItem} className="w-full py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2">
                            <Plus size={18} /> Adicionar Item
                        </button>
                    </div>

                    {/* Added Items List */}
                    {addedItems.length > 0 && (
                      <div>
                        {addedItems.map(item => (
                          <div key={item.id} className="flex justify-between items-center p-3 border-b border-slate-100">
                            <div>
                              <p className="font-bold text-slate-800">{item.quantity}x {item.name}</p>
                              <p className="text-xs text-slate-500">{item.selectedVariationIds?.length || 0} variações</p>
                            </div>
                            <div className="flex items-center gap-4">
                              <span className="font-bold">R$ {(item.price * item.quantity).toFixed(2)}</span>
                              <button type="button" onClick={() => handleRemoveItem(item.id)} className="text-red-400 hover:text-red-600"><Trash2 size={16}/></button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                </div>
                 
                {/* OBSERVAÇÕES */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                  <h2 className="text-lg font-bold text-slate-800 mb-2">Observações</h2>
                  <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} className="w-full p-3 border border-slate-200 rounded-lg" placeholder="Cor, instruções especiais, etc."></textarea>
                </div>
            </div>
            
            {/* RIGHT COLUMN */}
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-white p-6 rounded-2xl shadow-lg border border-slate-100 sticky top-6 space-y-6">
                <h2 className="text-lg font-bold text-slate-800">Logística & Prazos</h2>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Data de Entrega</label>
                  <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} required className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Urgência</label>
                  <select value={urgency} onChange={e => setUrgency(e.target.value as UrgencyLevel)} className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg">
                    <option value={UrgencyLevel.NORMAL}>Normal</option>
                    <option value={UrgencyLevel.HIGH}>Alta</option>
                    <option value={UrgencyLevel.VIP}>VIP/Prometido</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Nº Caixa</label>
                    <input value={boxNumber} onChange={e => setBoxNumber(e.target.value)} className="w-full text-center px-3 py-2 bg-white border border-slate-300 rounded-lg" />
                  </div>
                   <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Cor</label>
                    <div className="flex gap-1.5 flex-wrap items-center">
                      {BOX_COLORS.map(c => (
                        <button type="button" key={c.id} onClick={() => setSelectedColorId(c.id)} style={{backgroundColor: c.hex}} className={`w-6 h-6 rounded-full border-2 ${selectedColorId === c.id ? 'border-slate-800 scale-110' : 'border-white'}`}></button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="border-t border-slate-200 pt-4">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-slate-500 font-bold">Total do Pedido</span>
                    <span className="text-2xl font-bold text-slate-900">R$ {addedItems.reduce((acc, i) => acc + i.price * i.quantity, 0).toFixed(2)}</span>
                  </div>
                   <button type="submit" className="w-full py-4 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 flex items-center justify-center gap-2 shadow-lg shadow-green-200">
                    <Save size={20} /> Salvar Trabalho
                  </button>
                </div>
              </div>
            </div>
        </form>
    </div>
  );
};