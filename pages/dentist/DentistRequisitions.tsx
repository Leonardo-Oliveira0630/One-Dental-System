import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { OnlineRequisition, Attachment } from '../../types';
import { apiAddPatientHistory } from '../../services/firebaseService';
import { ClipboardList, Plus, FileText, Send, Loader2, AlertCircle, CheckCircle, Clock, Trash2, HelpCircle, HardDrive, ShieldAlert, Building, RefreshCw } from 'lucide-react';
import { AttachmentPreviewModal } from '../../components/AttachmentPreviewModal';
import { db } from '../../services/firebaseConfig';
import * as firestorePkg from 'firebase/firestore';

const { collection, getDocs, doc, getDoc } = firestorePkg as any;

interface LaboratoryOption {
  id: string;
  name: string;
}

interface ServiceOption {
  id: string;
  name: string;
  basePrice?: number;
  variationGroups?: any[];
}

export const DentistRequisitions = () => {
  const { 
    currentUser, 
    currentOrg, 
    onlineRequisitions, 
    addOnlineRequisition,
    patients,
    uploadFile
  } = useApp();

  const userAny = currentUser as any;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [labs, setLabs] = useState<LaboratoryOption[]>([]);
  const [services, setServices] = useState<ServiceOption[]>([]);

  // Form selections and inputs
  const [selectedLabId, setSelectedLabId] = useState('');
  const [patientName, setPatientName] = useState('');
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // State for attachment previews
  const [selectedAttachment, setSelectedAttachment] = useState<Attachment | null>(null);
  const [allAttachmentsForPreview, setAllAttachmentsForPreview] = useState<Attachment[]>([]);

  // Selector or manual input toggle for patient name
  const [patientInputMode, setPatientInputMode] = useState<'SELECT' | 'MANUAL'>('MANUAL');
  const [isModeSetAutomatically, setIsModeSetAutomatically] = useState(false);

  const [showPatientSuggestions, setShowPatientSuggestions] = useState(false);
  const patientInputContainerRef = useRef<HTMLDivElement>(null);

  const filteredPatients = useMemo(() => {
    if (!patientName.trim()) return patients || [];
    const searchLower = patientName.toLowerCase();
    return (patients || []).filter(p => 
      p.name.toLowerCase().includes(searchLower)
    );
  }, [patients, patientName]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (patientInputContainerRef.current && !patientInputContainerRef.current.contains(event.target as Node)) {
        setShowPatientSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!isModeSetAutomatically && patients && patients.length > 0) {
      setPatientInputMode('SELECT');
      setIsModeSetAutomatically(true);
    }
  }, [patients, isModeSetAutomatically]);

  // Dynamic service variations and quantity
  const [selectedVariations, setSelectedVariations] = useState<Record<string, string | string[]>>({});
  const [quantity, setQuantity] = useState<number>(1);

  useEffect(() => {
    setSelectedVariations({});
    setQuantity(1);
  }, [selectedServiceId]);

  const handleVariationChange = (group: any, optionId: string) => {
    const isSingle = group.selectionType === 'SINGLE';
    if (isSingle) {
      if (selectedVariations[group.id] === optionId) {
        const copy = { ...selectedVariations };
        delete copy[group.id];
        setSelectedVariations(copy);
      } else {
        setSelectedVariations({ ...selectedVariations, [group.id]: optionId });
      }
    } else {
      const prev = selectedVariations[group.id] as string[] || [];
      if (prev.includes(optionId)) {
        setSelectedVariations({
          ...selectedVariations,
          [group.id]: prev.filter(id => id !== optionId)
        });
      } else {
        setSelectedVariations({
          ...selectedVariations,
          [group.id]: [...prev, optionId]
        });
      }
    }
  };

  // File Attachments state
  const [attachedFiles, setAttachedFiles] = useState<{ name: string; url: string; size: string; isUploading?: boolean; error?: string }[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  // Fetch permitted/linked laboratories
  useEffect(() => {
    const fetchConnectedLabs = async () => {
      if (!currentUser) return;
      try {
        setLoading(true);
        const fetchedLabs: LaboratoryOption[] = [];

        // 1. Check direct connection via connectedLabId
        if (userAny?.connectedLabId) {
          const directLabDoc = await getDoc(doc(db, 'organizations', userAny.connectedLabId));
          if (directLabDoc.exists()) {
            fetchedLabs.push({
              id: userAny.connectedLabId,
              name: directLabDoc.data().name || 'Laboratório Conveniado'
            });
          }
        }

        // 2. Check connections in standard subcollection /organizations/{myOrgId}/connections
        if (userAny?.organizationId) {
          const connSnap = await getDocs(collection(db, 'organizations', userAny.organizationId, 'connections'));
          connSnap.forEach((docRef: any) => {
            const data = docRef.data();
            if (data.status === 'ACTIVE' && data.organizationId !== userAny.connectedLabId) {
              fetchedLabs.push({
                id: data.organizationId,
                name: data.organizationName || 'Laboratório'
              });
            }
          });
        }

        setLabs(fetchedLabs);
        if (fetchedLabs.length > 0) {
          setSelectedLabId(fetchedLabs[0].id);
        }

        setLoading(false);
      } catch (err) {
        console.error('Error fetching partner laboratories:', err);
        setError('Falha ao carregar laboratórios parceiros relacionados.');
        setLoading(false);
      }
    };

    fetchConnectedLabs();
  }, [currentUser]);

  // Fetch services/jobTypes of the selected laboratory dynamically when selection changes
  useEffect(() => {
    const fetchLabServices = async () => {
      if (!selectedLabId) {
        setServices([]);
        return;
      }
      try {
        const servSnap = await getDocs(collection(db, 'organizations', selectedLabId, 'jobTypes'));
        const list: ServiceOption[] = [];
        servSnap.forEach((docRef: any) => {
          const data = docRef.data();
          if (data.isVisibleInternally !== false) {
            list.push({
              id: data.id,
              name: data.name,
              basePrice: data.basePrice || 0,
              variationGroups: data.variationGroups || []
            });
          }
        });
        setServices(list);
        if (list.length > 0) {
          setSelectedServiceId(list[0].id);
        } else {
          setSelectedServiceId('');
        }
      } catch (err) {
        console.error('Error fetching laboratory service list:', err);
      }
    };

    fetchLabServices();
  }, [selectedLabId]);

  // Handle file upload to real Firebase Storage synchronously/asynchronously on file select
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const filesArr = Array.from(e.target.files);
      await processAndUploadFiles(filesArr);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const filesArr = Array.from(e.dataTransfer.files);
      await processAndUploadFiles(filesArr);
    }
  };

  const processAndUploadFiles = async (files: File[]) => {
    const startIndex = attachedFiles.length;
    const newItems = files.map((file) => {
      const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
      const localUrl = URL.createObjectURL(file); // Keep local Object URL for fast preliminary rendering
      return {
        name: file.name,
        url: localUrl,
        size: `${sizeMb} MB`,
        isUploading: true
      };
    });

    setAttachedFiles(prev => [...prev, ...newItems]);

    // Sequentially upload each file to Firebase Storage
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const targetIndex = startIndex + i;
      try {
        const publicUrl = await uploadFile(file);
        setAttachedFiles(prev => {
          return prev.map((item, idx) => {
            if (idx === targetIndex) {
              return {
                ...item,
                url: publicUrl,
                isUploading: false
              };
            }
            return item;
          });
        });
      } catch (err: any) {
        console.error("Error uploading file to Firebase Storage:", err);
        setAttachedFiles(prev => {
          return prev.map((item, idx) => {
            if (idx === targetIndex) {
              return {
                ...item,
                isUploading: false,
                error: 'Erro no envio'
              };
            }
            return item;
          });
        });
      }
    }
  };

  const removeAttachment = (index: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    if (!selectedLabId) {
      setError('Selecione o laboratório para o envio.');
      return;
    }

    if (!patientName.trim()) {
      setError('Por favor, informe o nome do paciente.');
      return;
    }

    if (!selectedServiceId) {
      setError('Por favor, selecione o serviço desejado.');
      return;
    }

    if (attachedFiles.some(f => f.isUploading)) {
      setError('Aguarde o carregamento completo dos arquivos anexados antes de enviar.');
      return;
    }

    if (attachedFiles.some(f => f.error)) {
      setError('Por favor, remova ou reenvie os arquivos que falharam no carregamento.');
      return;
    }

    setSubmitting(true);

    try {
      const activeLab = labs.find(l => l.id === selectedLabId);
      const activeService = services.find(s => s.id === selectedServiceId);

      const mappedAttachments: Attachment[] = attachedFiles.map((f, idx) => ({
        id: `att_${idx}_${Date.now()}`,
        name: f.name,
        url: f.url,
        uploadedAt: new Date()
      }));

      const allSelectedOptionIds = Object.values(selectedVariations).flat() as string[];

      // Create new requisition on Firebase
      const reqPayload: Omit<OnlineRequisition, 'id' | 'createdAt'> = {
        labId: selectedLabId,
        labName: activeLab?.name || 'Laboratório',
        dentistId: currentUser?.id || '',
        dentistManualId: userAny?.manualDentistId || '',
        dentistName: currentUser?.name || 'Dentista Parceiro',
        dentistClinicName: currentOrg?.name || currentUser?.clinicName || 'Consultório Parceiro',
        patientName: patientName.toUpperCase().trim(),
        serviceId: selectedServiceId,
        serviceName: activeService?.name || 'Serviço de Prótese',
        notes: notes.trim(),
        status: 'PENDING',
        attachments: mappedAttachments,
        selectedVariationIds: allSelectedOptionIds,
        quantity: quantity
      };

      await addOnlineRequisition(selectedLabId, reqPayload);

      // Save prosthesis history in selected patient clinical history records
      if (selectedPatientId && currentUser) {
        try {
          const specsCompiled = `${quantity}x ${activeService?.name || 'Serviço de Prótese'}`;
          const labName = activeLab?.name || 'Laboratório';
          const descriptionText = `Enviada requisição online ao Laboratório: ${labName}. Requisito: ${specsCompiled}.`;

          const historyRecord: any = {
            id: `hist_${Date.now()}`,
            patientId: selectedPatientId,
            type: 'PROSTHESIS',
            description: descriptionText,
            date: new Date(),
            createdAt: new Date(),
            professionalId: currentUser.id,
            professionalName: currentUser.name,
            labName: labName,
            labId: selectedLabId,
            specs: specsCompiled,
            attachments: mappedAttachments || []
          };

          const dentistOrgId = currentUser.organizationId;
          if (dentistOrgId) {
            await apiAddPatientHistory(dentistOrgId, selectedPatientId, historyRecord);
          }
        } catch (historyErr) {
          console.error("Erro ao registrar histórico do paciente na requisição online:", historyErr);
        }
      }

      setSuccess(true);
      setPatientName('');
      setSelectedPatientId('');
      setNotes('');
      setAttachedFiles([]);
      setSelectedVariations({});
      setQuantity(1);
    } catch (err: any) {
      console.error('Error submitting online requisition:', err);
      setError(err.message || 'Falha ao transmitir requisição para o laboratório.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
        <Loader2 className="h-10 w-10 text-indigo-600 animate-spin mb-4" />
        <p className="text-slate-500 font-medium">Carregando portal de requisições...</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* Overview Header */}
      <div>
        <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
          <ClipboardList className="text-indigo-600" size={28} />
          Portal de Requisições de Trabalho
        </h2>
        <p className="text-sm text-slate-500">
          Envie pedidos de serviços rápidos, guias de trabalho, fotos e arquivos 3D diretamente para os seus laboratórios conectados de forma segura.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Side: Submit Panel */}
        <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-6">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-4">
            <Send className="text-indigo-600" size={20} />
            <h3 className="font-extrabold text-slate-800">Nova Requisição Online</h3>
          </div>

          {error && (
            <div className="p-4 bg-red-50 text-red-600 text-sm rounded-2xl flex items-center gap-2 border border-red-100">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-4 bg-emerald-50 text-emerald-800 text-sm rounded-2xl flex items-center gap-2 border border-emerald-100 font-bold">
              <CheckCircle size={18} className="text-emerald-600" />
              <span>Sua requisição foi enviada com sucesso!</span>
            </div>
          )}

          {labs.length === 0 ? (
            <div className="p-8 text-center bg-amber-50/50 rounded-2xl border border-amber-100 flex flex-col items-center gap-2">
              <Building className="text-amber-500" size={32} />
              <p className="text-xs font-bold text-slate-700">Nenhum Laboratório Vinculado</p>
              <p className="text-[11px] text-slate-500 max-w-xs">
                Para enviar requisições de trabalho, você precisa de um laboratório parceiro conectado à sua conta. Solicite o link de requisição para o seu laboratório.
              </p>
            </div>
          ) : (
            <form className="space-y-5" onSubmit={handleSubmit}>
              {/* Select Lab */}
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5 ml-1">
                  Laboratório Destinatário *
                </label>
                <select
                  required
                  value={selectedLabId}
                  onChange={(e) => setSelectedLabId(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-700"
                >
                  {labs.map(lab => (
                    <option key={lab.id} value={lab.id}>
                      {lab.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Patient Name */}
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5 ml-1">
                  Paciente *
                </label>
                <div ref={patientInputContainerRef} className="relative">
                  <input
                    type="text"
                    required
                    value={patientName}
                    onChange={(e) => {
                      setPatientName(e.target.value);
                      setSelectedPatientId('');
                      setShowPatientSuggestions(true);
                    }}
                    onFocus={() => setShowPatientSuggestions(true)}
                    placeholder="DIGITE OU SELECIONE UM PACIENTE..."
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold uppercase text-slate-700 placeholder:normal-case placeholder:font-medium placeholder:text-slate-400"
                  />
                  {showPatientSuggestions && filteredPatients.length > 0 && (
                    <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-slate-150 rounded-2xl shadow-xl max-h-[220px] overflow-y-auto divide-y divide-slate-50">
                      {filteredPatients.map(p => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            setPatientName(p.name.toUpperCase());
                            setSelectedPatientId(p.id);
                            setShowPatientSuggestions(false);
                          }}
                          className="w-full text-left px-4 py-3.5 hover:bg-slate-50 text-xs font-bold text-slate-700 uppercase transition-colors"
                        >
                          {p.name.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Select Service */}
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5 ml-1">
                  Serviço Solicitado *
                </label>
                {services.length === 0 ? (
                  <p className="text-xs text-amber-600 bg-amber-50 rounded-xl p-3">
                    Nenhum serviço disponível listado para este laboratório.
                  </p>
                ) : (
                  <div className="space-y-4">
                    <select
                      required
                      value={selectedServiceId}
                      onChange={(e) => setSelectedServiceId(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-700 text-sm"
                    >
                      <option value="" disabled>SELECIONE UM TRABALHO / SERVIÇO</option>
                      {services.map(ser => (
                        <option key={ser.id} value={ser.id}>
                          {ser.name}
                        </option>
                      ))}
                    </select>

                    {/* Active Service Variations Selection (Strictly NO prices/modifiers) */}
                    {(() => {
                      const activeService = services.find(s => s.id === selectedServiceId);
                      if (!activeService) return null;
                      
                      return (
                        <div className="space-y-4 animate-in fade-in duration-300">
                          {activeService.variationGroups && activeService.variationGroups.length > 0 && (
                            <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl space-y-4">
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-200 pb-1.5">
                                Especificações & Variações da Prótese
                              </p>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {activeService.variationGroups.map(group => (
                                  <div key={group.id} className="space-y-2">
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                      {group.name}
                                    </label>
                                    <div className="flex flex-wrap gap-1.5">
                                      {group.options?.map((option: any) => {
                                        const isSelected = group.selectionType === 'SINGLE' 
                                          ? selectedVariations[group.id] === option.id 
                                          : (selectedVariations[group.id] as string[] || []).includes(option.id);
                                        return (
                                          <button
                                            key={option.id}
                                            type="button"
                                            onClick={() => handleVariationChange(group, option.id)}
                                            className={`px-3 py-2 rounded-xl text-[10px] font-bold uppercase transition-all border ${
                                              isSelected 
                                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm scale-102 font-black' 
                                                : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-400 hover:text-indigo-600'
                                            }`}
                                          >
                                            {option.name}
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Quantity Selector */}
                          <div className="w-24">
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5 ml-1">
                              Quantidade *
                            </label>
                            <input
                              type="number"
                              min="1"
                              required
                              value={quantity}
                              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-center font-black text-slate-700 focus:ring-2 focus:ring-indigo-500"
                            />
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>

              {/* Drag and Drop File Attachments */}
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5 ml-1">
                  Enviar Arquivos 3D (STL/PLY), Fotos ou Vídeos do Caso
                </label>
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-2xl p-6 text-center transition flex flex-col items-center justify-center cursor-pointer ${
                    isDragging ? 'border-indigo-500 bg-indigo-50/50' : 'border-slate-200 bg-slate-50 hover:bg-slate-100/50'
                  }`}
                >
                  <HardDrive className="text-slate-400 mb-2" size={32} />
                  <p className="text-xs font-bold text-slate-700 mb-1">
                    Arraste e solte seus arquivos de imagem, vídeo ou STL aqui
                  </p>
                  <p className="text-[10px] text-slate-400 mb-3">ou clique para computador</p>
                  
                  <input
                    type="file"
                    multiple
                    onChange={handleFileUpload}
                    className="hidden"
                    id="requisitionFiles"
                  />
                  <label
                    htmlFor="requisitionFiles"
                    className="px-4 py-1.5 bg-white border border-slate-200 font-extrabold text-[11px] rounded-xl text-slate-600 shadow-sm hover:bg-slate-50 cursor-pointer"
                  >
                    Selecionar Arquivos
                  </label>
                </div>

                {/* Attachments List */}
                {attachedFiles.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Arquivos anexados ({attachedFiles.length})</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {attachedFiles.map((file, idx) => (
                        <div key={idx} className="flex justify-between items-center bg-slate-50/55 p-2 rounded-xl border border-slate-100 text-xs">
                          <span className="font-bold text-slate-700 truncate max-w-[130px]" title={file.name}>
                            {file.name}
                          </span>
                          <div className="flex items-center gap-1.5 ml-2">
                            {file.isUploading ? (
                              <span className="text-[9px] text-indigo-500 font-bold flex items-center gap-1 uppercase tracking-wider shrink-0">
                                <Loader2 size={10} className="animate-spin shrink-0" /> <span className="hidden xs:inline">Enviando...</span>
                              </span>
                            ) : file.error ? (
                              <span className="text-[9px] text-red-500 font-bold uppercase tracking-wider shrink-0" title={file.error}>
                                Falhou
                              </span>
                            ) : (
                              <span className="text-[9px] text-emerald-600 font-black uppercase tracking-wider shrink-0">
                                Pronto
                              </span>
                            )}
                            <span className="text-[9px] text-slate-400 shrink-0">{file.size}</span>
                            <button
                              type="button"
                              onClick={() => removeAttachment(idx)}
                              className="text-red-500 hover:bg-red-50 p-1.5 rounded-lg shrink-0"
                              disabled={file.isUploading}
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Service Observations */}
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5 ml-1">
                  Observações de Serviço
                </label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Informe detalhes de cor da prótese, especificidades do material, dentes específicos, ou outras recomendações importantes..."
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700 text-xs"
                />
              </div>

              {/* Submit Action */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={submitting || services.length === 0}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 rounded-2xl text-xs flex items-center justify-center gap-2 transition disabled:opacity-50"
                >
                  {submitting ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      <Send size={14} /> Transmitir Caso ao Laboratório
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Right Side: Requisition History Tracker */}
        <div className="lg:col-span-5 bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-6 flex flex-col h-fit">
          <div className="flex justify-between items-center border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2">
              <Clock className="text-slate-500" size={20} />
              <h3 className="font-extrabold text-slate-800">Acompanhamento de Envios</h3>
            </div>
          </div>

          <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
            {(!onlineRequisitions || onlineRequisitions.filter(r => r.dentistId === currentUser?.id || r.dentistManualId === userAny?.manualDentistId).length === 0) ? (
              <div className="p-12 text-center text-slate-400 italic text-xs">
                Nenhuma requisição enviada recentemente por você.
              </div>
            ) : (
              onlineRequisitions
                .filter(r => r.dentistId === currentUser?.id || r.dentistManualId === userAny?.manualDentistId)
                .map(req => (
                  <div 
                    key={req.id} 
                    className="p-4 rounded-2xl border border-slate-100 bg-slate-50/40 hover:bg-slate-50/90 transition flex flex-col gap-2"
                  >
                    <div className="flex justify-between items-start gap-1">
                      <div>
                        <div className="font-bold text-slate-800 text-xs uppercase">{req.patientName}</div>
                        <div className="text-[10px] font-bold text-slate-700">{req.serviceName}</div>
                        {req.quantity && req.quantity > 0 && (
                          <div className="text-[9px] font-bold text-slate-500 mt-0.5">
                            Quantidade: {req.quantity} {req.quantity === 1 ? 'item' : 'itens/dentes'}
                          </div>
                        )}
                        {req.selectedVariationIds && req.selectedVariationIds.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {req.selectedVariationIds.map(varId => {
                              let foundName = '';
                              for (const s of services) {
                                if (s.variationGroups) {
                                  for (const g of s.variationGroups) {
                                    const opt = g.options?.find((o: any) => o.id === varId);
                                    if (opt) {
                                      foundName = `${g.name}: ${opt.name}`;
                                      break;
                                    }
                                  }
                                }
                                if (foundName) break;
                              }
                              if (!foundName) return null;
                              return (
                                <span key={varId} className="bg-slate-100 text-slate-600 border border-slate-200 rounded px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-tight">
                                  {foundName}
                                </span>
                              );
                            })}
                          </div>
                        )}
                      </div>
                      
                      <span className={`inline-block text-[8px] font-black px-2 py-0.5 rounded uppercase tracking-wider ${
                        req.status === 'PENDING' ? 'bg-amber-100 text-amber-800' :
                        req.status === 'ACCEPTED' ? 'bg-emerald-100 text-emerald-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {req.status === 'PENDING' ? 'Pendente' :
                         req.status === 'ACCEPTED' ? 'Aceito' : 'Recusado'}
                      </span>
                    </div>

                    {req.notes && (
                      <p className="text-[10px] text-slate-500 italic line-clamp-2">
                        "{req.notes}"
                      </p>
                    )}

                    {req.attachments && req.attachments.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {req.attachments.map((file, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => {
                              setSelectedAttachment(file);
                              setAllAttachmentsForPreview(req.attachments || []);
                            }}
                            className="bg-white hover:bg-slate-50 border border-slate-200 text-[8px] px-1.5 py-0.5 rounded text-indigo-600 hover:text-indigo-800 font-bold truncate max-w-[125px] transition-colors flex items-center gap-1 focus:outline-none"
                            title="Clique de visualização/download de arquivo"
                          >
                            <FileText size={8} className="shrink-0" /> {file.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))
            )}
          </div>
        </div>
      </div>

      {selectedAttachment && (
        <AttachmentPreviewModal 
          file={selectedAttachment}
          allAttachments={allAttachmentsForPreview}
          onClose={() => {
            setSelectedAttachment(null);
            setAllAttachmentsForPreview([]);
          }}
        />
      )}
    </div>
  );
};
