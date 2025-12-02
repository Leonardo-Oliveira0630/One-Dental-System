import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { JobType, UserRole, JobStatus, UrgencyLevel, Job, JobItem, JobVariation } from '../types';
import { BOX_COLORS } from '../services/mockData';
import { Plus, Trash2, Save, User, Box, FileText, CheckCircle, Search, RefreshCw, ArrowRight, Printer, X, FileCheck, DollarSign } from 'lucide-react';

type EntryType = 'NEW' | 'CONTINUATION';

export const NewJob = () => {
  const { addJob, jobs, jobTypes, currentUser, triggerPrint } = useApp();
  const navigate = useNavigate();

  // Mode State
  const [entryType, setEntryType] = useState<EntryType>('NEW');
  const [searchParentTerm, setSearchParentTerm] = useState('');
  const [showParentSearch, setShowParentSearch] = useState(false);

  // Form State
  const [patientName, setPatientName] = useState('');
  const [dentistName, setDentistName] = useState('');
  const [osNumber, setOsNumber] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [boxNumber, setBoxNumber] = useState('');
  const [selectedColorId, setSelectedColorId] = useState(BOX_COLORS[0].id);
  const [urgency, setUrgency] = useState<UrgencyLevel>(UrgencyLevel.NORMAL);
  const [notes, setNotes] = useState('');

  // Items State
  const [selectedTypeId, setSelectedTypeId] = useState(jobTypes[0]?.id || '');
  const [quantity, setQuantity] = useState(1);
  const [selectedVariations, setSelectedVariations] = useState<string[]>([]);
  const [commissionDisabled, setCommissionDisabled] = useState(false); // New Flag
  const [addedItems, setAddedItems] = useState<JobItem[]>([]);

  // Success Modal State
  const [lastCreatedJob, setLastCreatedJob] = useState<Job | null>(null);

  // Derived
  const activeJobType = jobTypes.find(t => t.id === selectedTypeId);

  // --- OS GENERATION LOGIC ---

  // Generate standard 4-digit ID for new jobs (0001, 0002...)
  const generateNextNewOs = () => {
    let maxId = 0;
    jobs.forEach(j => {
      // Split to ignore suffixes (get only the base number)
      const basePart = j.osNumber?.split('-')[0];
      const num = parseInt(basePart || '0');
      if (!isNaN(num) && num > maxId) {
        maxId = num;
      }
    });
    const nextId = maxId + 1;
    // Format to 0001
    return nextId.toString().padStart(4, '0');
  };

  // Generate Suffix ID for continuations (0001-2, 0001-3...)
  const generateContinuationOs = (parentJob: Job) => {
    const baseOs = parentJob.osNumber?.split('-')[0]; // Ensure we get the root "0001"
    if (!baseOs) return generateNextNewOs();

    // Find all jobs that share this base OS
    const relatedJobs = jobs.filter(j => j.osNumber?.startsWith(baseOs));
    
    let maxSuffix = 1;
    
    relatedJobs.forEach(j => {
      const parts = j.osNumber?.split('-');
      if (parts && parts.length > 1) {
        const suffix = parseInt(parts[1]);
        if (!isNaN(suffix) && suffix > maxSuffix) {
          maxSuffix = suffix;
        }
      }
    });

    return `${baseOs}-${maxSuffix + 1}`;
  };

  // Effect: Update OS when Entry Type changes
  useEffect(() => {
    if (entryType === 'NEW') {
        const next = generateNextNewOs();
        setOsNumber(next);
        setPatientName('');
        setDentistName('');
        setNotes('');
    }
    
    // Default Due Date (Today + 3 days)
    const d = new Date();
    d.setDate(d.getDate() + 3);
    setDueDate(d.toISOString().split('T')[0]);
  }, [entryType, jobs]); // Depend on jobs to recalculate if needed

  // --- HANDLERS ---

  const handleSelectParentJob = (job: Job) => {
    const nextOs = generateContinuationOs(job);
    setOsNumber(nextOs);
    setPatientName(job.patientName);
    setDentistName(job.dentistName);
    setNotes(`Continuação do caso OS ${job.osNumber}. \n`);
    setShowParentSearch(false);
    setSearchParentTerm('');
  };

  const handleToggleVariation = (variation: JobVariation) => {
    if (!activeJobType) return;
    const isSelected = selectedVariations.includes(variation.id);
    let newSelection = [...selectedVariations];

    if (isSelected) {
      newSelection = newSelection.filter(id => id !== variation.id);
    } else {
      if (variation.group) {
        const siblings = activeJobType.variations
          .filter(v => v.group === variation.group && v.id !== variation.id)
          .map(v => v.id);
        newSelection = newSelection.filter(id => !siblings.includes(id));
      }
      newSelection.push(variation.id);
    }
    setSelectedVariations(newSelection);
  };

  const handleAddItem = () => {
    if (!activeJobType) return;
    let unitPrice = activeJobType.basePrice;
    selectedVariations.forEach(vid => {
        const v = activeJobType.variations.find(v => v.id === vid);
        if(v) unitPrice += v.priceModifier;
    });

    const newItem: JobItem = {
      id: Math.random().toString(),
      jobTypeId: activeJobType.id,
      name: activeJobType.name,
      quantity: quantity,
      price: unitPrice,
      selectedVariationIds: selectedVariations,
      commissionDisabled: commissionDisabled
    };

    setAddedItems([...addedItems, newItem]);
    setQuantity(1);
    setSelectedVariations([]);
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

    // EXPLICIT ACTION STRING FOR HISTORY
    const actionText = entryType === 'NEW' 
        ? `Cadastro Inicial realizado por ${currentUser.name}` 
        : `Continuação/Retorno registrada por ${currentUser.name}`;

    const newJob: Job = {
      id: Math.random().toString(36).substr(2, 9),
      osNumber, // Uses the state which might be auto-generated or manually edited
      patientName,
      dentistId: 'manual-entry', 
      dentistName,
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
    setLastCreatedJob(newJob); // Triggers Modal
  };

  const handleFinish = () => {
    setLastCreatedJob(null);
    navigate('/jobs');
  };

  // Filter for parent search
  const filteredParents = jobs.filter(j => 
    (j.osNumber?.includes(searchParentTerm) || j.patientName.toLowerCase().includes(searchParentTerm.toLowerCase())) &&
    searchParentTerm.length > 0
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* SUCCESS MODAL */}
      {lastCreatedJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-lg w-full text-center relative animate-in fade-in zoom-in duration-300">
                <button onClick={handleFinish} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
                    <X size={24} />
                </button>
                
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 text-green-600">
                    <CheckCircle size={40} />
                </div>
                
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Trabalho Registrado!</h2>
                <p className="text-slate-500 mb-8">
                    OS <span className="font-mono font-bold text-slate-800">{lastCreatedJob.osNumber}</span> criada com sucesso.
                    <br/>O que deseja imprimir agora?
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button 
                        onClick={() => triggerPrint(lastCreatedJob, 'SHEET')}
                        className="flex flex-col items-center gap-3 p-6 bg-blue-50 border border-blue-200 rounded-2xl hover:bg-blue-100 hover:border-blue-300 transition-all group"
                    >
                        <FileCheck size={32} className="text-blue-600 group-hover:scale-110 transition-transform" />
                        <span className="font-bold text-blue-800">Imprimir Ficha</span>
                    </button>

                    <button 
                        onClick={() => triggerPrint(lastCreatedJob, 'LABEL')}
                        className="flex flex-col items-center gap-3 p-6 bg-purple-50 border border-purple-200 rounded-2xl hover:bg-purple-100 hover:border-purple-300 transition-all group"
                    >
                        <div className="rotate-90">
                            <Printer size={32} className="text-purple-600 group-hover:scale-110 transition-transform" />
                        </div>
                        <span className="font-bold text-purple-800">Imprimir Etiqueta</span>
                    </button>
                </div>

                <button 
                    onClick={handleFinish}
                    className="mt-8 text-slate-500 font-medium hover:text-slate-800 underline"
                >
                    Pular impressão e ir para lista
                </button>
            </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
            <h1 className="text-2xl font-bold text-slate-900">Nova Entrada de Bancada</h1>
            <p className="text-slate-500">Registre um novo trabalho físico ou retorno.</p>
        </div>
        
        {/* Entry Type Toggle */}
        <div className="bg-white p-1 rounded-xl shadow-sm border border-slate-200 flex w-full md:w-auto">
            <button
                type="button"
                onClick={() => setEntryType('NEW')}
                className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                    entryType === 'NEW' ? 'bg-blue-100 text-blue-700' : 'text-slate-500 hover:bg-slate-50'
                }`}
            >
                <Plus size={16} /> <span className="hidden sm:inline">Novo Caso</span><span className="sm:hidden">Novo</span>
            </button>
            <div className="w-px bg-slate-200 mx-1"></div>
            <button
                type="button"
                onClick={() => setEntryType('CONTINUATION')}
                className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                    entryType === 'CONTINUATION' ? 'bg-purple-100 text-purple-700' : 'text-slate-500 hover:bg-slate-50'
                }`}
            >
                <RefreshCw size={16} /> <span className="hidden sm:inline">Continuação / Ajuste</span><span className="sm:hidden">Retorno</span>
            </button>
        </div>
      </div>

      {/* Continuation Search Panel */}
      {entryType === 'CONTINUATION' && (
        <div className="bg-purple-50 border border-purple-100 p-6 rounded-2xl animate-in fade-in slide-in-from-top-2">
            <label className="block text-sm font-bold text-purple-800 mb-2">Buscar Trabalho Original</label>
            <div className="relative">
                <Search className="absolute left-3 top-3 text-purple-400" size={20} />
                <input 
                    type="text"
                    value={searchParentTerm}
                    onChange={e => {
                        setSearchParentTerm(e.target.value);
                        setShowParentSearch(true);
                    }}
                    placeholder="Digite o Nome do Paciente ou Número da OS anterior..."
                    className="w-full pl-10 pr-4 py-3 border border-purple-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none shadow-sm"
                    autoFocus
                />
                
                {showParentSearch && searchParentTerm.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-slate-100 z-10 max-h-60 overflow-y-auto">
                        {filteredParents.length === 0 ? (
                            <div className="p-4 text-slate-400 text-center">Nenhum trabalho encontrado.</div>
                        ) : (
                            filteredParents.map(job => (
                                <button
                                    key={job.id}
                                    type="button"
                                    onClick={() => handleSelectParentJob(job)}
                                    className="w-full text-left p-3 hover:bg-purple-50 border-b border-slate-50 flex justify-between items-center group"
                                >
                                    <div>
                                        <span className="font-mono font-bold text-slate-700 group-hover:text-purple-700 block">{job.osNumber}</span>
                                        <span className="text-sm text-slate-500">{job.patientName} (Dr. {job.dentistName})</span>
                                    </div>
                                    <ArrowRight size={16} className="text-slate-300 group-hover:text-purple-500" />
                                </button>
                            ))
                        )}
                    </div>
                )}
            </div>
            <p className="text-xs text-purple-600 mt-2">
                Selecione o trabalho anterior para gerar automaticamente a OS sequencial (Ex: 0042-2).
            </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Main Info */}
        <div className="lg:col-span-2 space-y-6">
            {/* Case Info */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <User size={20} className="text-blue-600" /> Informações do Caso
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-slate-700 mb-1">Nome do Dentista</label>
                        <input 
                            required
                            type="text"
                            value={dentistName}
                            onChange={e => setDentistName(e.target.value)}
                            className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="Nome ou Clínica"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Nome do Paciente</label>
                        <input 
                            required
                            type="text"
                            value={patientName}
                            onChange={e => setPatientName(e.target.value)}
                            className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="Nome Completo"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Data de Entrega</label>
                        <input 
                            required
                            type="date"
                            value={dueDate}
                            onChange={e => setDueDate(e.target.value)}
                            className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    </div>
                </div>
            </div>

            {/* Work Items Builder */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <FileText size={20} className="text-blue-600" /> Especificações do Trabalho
                </h2>

                <div className="space-y-4 mb-6 p-4 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="flex flex-col md:flex-row gap-3 items-end">
                        <div className="flex-1 w-full">
                            <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Tipo de Serviço</label>
                            <select 
                                value={selectedTypeId}
                                onChange={e => {
                                    setSelectedTypeId(e.target.value);
                                    setSelectedVariations([]);
                                }}
                                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            >
                                {jobTypes.map(type => (
                                    <option key={type.id} value={type.id}>{type.name} - R$ {type.basePrice}</option>
                                ))}
                            </select>
                        </div>
                        <div className="w-full md:w-24">
                            <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Quantidade</label>
                            <input 
                                type="number"
                                min="1"
                                value={quantity}
                                onChange={e => setQuantity(parseInt(e.target.value))}
                                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>
                    </div>

                    {/* Variations Area */}
                    {activeJobType && activeJobType.variations.length > 0 && (
                        <div className="pt-2 border-t border-slate-200 mt-2">
                            <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">Opções & Adicionais</label>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                {activeJobType.variations.map(v => {
                                    const isSelected = selectedVariations.includes(v.id);
                                    return (
                                        <div 
                                            key={v.id}
                                            onClick={() => handleToggleVariation(v)}
                                            className={`cursor-pointer p-2 rounded-lg border flex justify-between items-center text-sm transition-all ${
                                                isSelected 
                                                    ? 'bg-blue-50 border-blue-300 text-blue-700' 
                                                    : 'bg-white border-slate-200 text-slate-600 hover:border-blue-200'
                                            }`}
                                        >
                                            <div className="flex items-center gap-2">
                                                <div className={`w-4 h-4 rounded border flex items-center justify-center ${isSelected ? 'bg-blue-600 border-blue-600' : 'border-slate-300'}`}>
                                                    {isSelected && <CheckCircle size={10} className="text-white" />}
                                                </div>
                                                <span>{v.name}</span>
                                            </div>
                                            <div className="text-xs font-semibold">
                                                {v.priceModifier > 0 ? `+R$ ${v.priceModifier}` : 'Grátis'}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )}

                    {/* Commission Toggle */}
                    <div className="flex items-center gap-2 pt-2 border-t border-slate-200 mt-2">
                        <input 
                            type="checkbox" 
                            id="commissionDisable"
                            checked={commissionDisabled}
                            onChange={(e) => setCommissionDisabled(e.target.checked)}
                            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                        />
                        <label htmlFor="commissionDisable" className="text-sm text-slate-600 select-none cursor-pointer flex items-center gap-1">
                            <DollarSign size={14} className="text-slate-400"/>
                            Isentar Comissão (Repetição/Garantia)
                        </label>
                    </div>
                    
                    <button 
                        type="button"
                        onClick={handleAddItem}
                        className="w-full py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
                    >
                        <Plus size={18} /> Adicionar Item
                    </button>
                </div>

                {/* Added Items List */}
                <div className="space-y-2">
                    {addedItems.length === 0 && (
                        <p className="text-center text-slate-400 py-4 italic">Nenhum item adicionado ainda.</p>
                    )}
                    {addedItems.map(item => {
                        const type = jobTypes.find(t => t.id === item.jobTypeId);
                        const varNames = item.selectedVariationIds?.map(vid => type?.variations.find(v => v.id === vid)?.name).join(', ');

                        return (
                            <div key={item.id} className="flex flex-col md:flex-row justify-between items-start md:items-center p-3 bg-white border border-slate-100 shadow-sm rounded-lg gap-2">
                                <div>
                                    <div className="font-bold text-slate-800">
                                        <span className="text-blue-600 mr-1">{item.quantity}x</span> {item.name}
                                    </div>
                                    {varNames && (
                                        <div className="text-xs text-slate-500 mt-0.5">
                                            + {varNames}
                                        </div>
                                    )}
                                    {item.commissionDisabled && (
                                        <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded mt-1 inline-block border border-gray-200">
                                            Sem Comissão
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
                                    <span className="font-bold text-slate-700">R$ {(item.price * item.quantity).toFixed(2)}</span>
                                    <button 
                                        type="button"
                                        onClick={() => handleRemoveItem(item.id)}
                                        className="text-red-400 hover:text-red-600 p-1"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                    {addedItems.length > 0 && (
                        <div className="text-right pt-2 border-t border-slate-100">
                            <span className="text-slate-500 text-sm mr-2">Total Estimado:</span>
                            <span className="text-xl font-bold text-slate-900">
                                R$ {addedItems.reduce((acc, item) => acc + (item.price * item.quantity), 0).toFixed(2)}
                            </span>
                        </div>
                    )}
                </div>
            </div>

            {/* Notes */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <label className="block text-sm font-medium text-slate-700 mb-2">Observações Técnicas</label>
                <textarea 
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none h-24 resize-none"
                    placeholder="Ex: Repetição devido a bolha na cerâmica..."
                />
            </div>
        </div>

        {/* Right Column: Logistics */}
        <div className="space-y-6">
            <div className={`p-6 rounded-2xl shadow-sm border transition-colors ${entryType === 'CONTINUATION' ? 'bg-purple-50 border-purple-200' : 'bg-white border-slate-100'}`}>
                <h2 className={`text-lg font-bold mb-4 flex items-center gap-2 ${entryType === 'CONTINUATION' ? 'text-purple-800' : 'text-slate-800'}`}>
                    <Box size={20} className={entryType === 'CONTINUATION' ? 'text-purple-600' : 'text-blue-600'} /> 
                    {entryType === 'CONTINUATION' ? 'Logística de Retorno' : 'Logística'}
                </h2>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Código da OS</label>
                        <input 
                            type="text"
                            value={osNumber}
                            onChange={e => setOsNumber(e.target.value)}
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg font-mono font-bold text-2xl text-center text-slate-800 tracking-widest"
                        />
                         <p className="text-[10px] text-slate-500 text-center mt-1">
                            {entryType === 'NEW' ? 'Gerado automaticamente (Novo)' : 'Gerado automaticamente (Sequencial)'}
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Nível de Urgência</label>
                        <select 
                            value={urgency}
                            onChange={e => setUrgency(e.target.value as UrgencyLevel)}
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none bg-white"
                        >
                            <option value={UrgencyLevel.LOW}>Baixa Prioridade</option>
                            <option value={UrgencyLevel.NORMAL}>Normal</option>
                            <option value={UrgencyLevel.HIGH}>Alta Prioridade</option>
                            <option value={UrgencyLevel.VIP}>VIP (Prometido)</option>
                        </select>
                    </div>

                    <div className="border-t border-slate-200 pt-4">
                         <label className="block text-sm font-medium text-slate-700 mb-1">Número da Caixa</label>
                         <input 
                            required
                            type="text"
                            value={boxNumber}
                            onChange={e => setBoxNumber(e.target.value)}
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                            placeholder="Ex: 12"
                        />
                    </div>

                    <div>
                         <label className="block text-sm font-medium text-slate-700 mb-2">Cor da Caixa</label>
                         <div className="flex flex-wrap gap-3">
                            {BOX_COLORS.map(color => (
                                <button
                                    key={color.id}
                                    type="button"
                                    onClick={() => setSelectedColorId(color.id)}
                                    className={`w-10 h-10 rounded-full border-4 shadow-sm transition-transform ${
                                        selectedColorId === color.id ? 'border-slate-600 scale-110' : 'border-white'
                                    }`}
                                    style={{ backgroundColor: color.hex }}
                                    title={color.name}
                                />
                            ))}
                         </div>
                    </div>
                </div>
            </div>

            <button 
                type="submit"
                className={`w-full py-4 text-white font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all transform hover:scale-[1.02] ${
                    entryType === 'CONTINUATION' 
                    ? 'bg-purple-600 hover:bg-purple-700 shadow-purple-200' 
                    : 'bg-green-600 hover:bg-green-700 shadow-green-200'
                }`}
            >
                <Save size={20} />
                {entryType === 'CONTINUATION' ? 'Salvar Retorno' : 'Criar Trabalho'}
            </button>
        </div>

      </form>
    </div>
  );
};