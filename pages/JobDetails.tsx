
import React, { useState, useEffect, Suspense, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { JobStatus, UrgencyLevel, UserRole, JobItem, LabRating, Job, DeliveryRoute, Attachment } from '../types';
import { 
  ArrowLeft, Calendar, User, Clock, MapPin, 
  FileText, DollarSign, CheckCircle, AlertTriangle, 
  Printer, Box, Layers, ListChecks, Bell, Edit, Save, X, Plus, Trash2,
  LogIn, LogOut, Flag, CheckSquare, File, Download, Loader2, CreditCard, ExternalLink, Copy, Check, Star, UploadCloud, ChevronDown, CheckCircle2, Truck, Navigation, RotateCcw, MessageCircle, MessageSquare, Lock, Crown, FileCode, FileSpreadsheet, FileWarning
} from 'lucide-react';
import { CreateAlertModal } from '../components/AlertSystem';
import { ChatSystem } from '../components/ChatSystem';
import { smartCompress } from '../services/compressionService';
import * as api from '../services/firebaseService';
import * as firestorePkg from 'firebase/firestore';
import { db } from '../services/firebaseConfig';

const { doc, onSnapshot } = firestorePkg as any;

const STLViewer = React.lazy(() => import('../components/STLViewer').then(module => ({ default: module.STLViewer })));

export const JobDetails = () => {
  const { id } = useParams();
  const { jobs, updateJob, triggerPrint, currentUser, jobTypes, uploadFile, addJobToRoute, currentOrg } = useApp();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<'SUMMARY' | 'PRODUCTION' | 'CHAT'>('SUMMARY');
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showRouteModal, setShowRouteModal] = useState(false);
  const [show3DViewer, setShow3DViewer] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  
  const [isUploadingFiles, setIsUploadingFiles] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadProgressMsg, setUploadProgressMsg] = useState('');

  const [routeInfo, setRouteInfo] = useState<DeliveryRoute | null>(null);
  const [routeDriver, setRouteDriver] = useState('');
  const [routeShift, setRouteShift] = useState<'MORNING' | 'AFTERNOON'>('MORNING');
  const [routeDate, setRouteDate] = useState(new Date().toISOString().split('T')[0]);

  const job = jobs.find(j => j.id === id);
  
  useEffect(() => {
      if (job?.routeId && currentOrg) {
          const routeRef = doc(db, 'organizations', currentOrg.id, 'routes', job.routeId);
          const unsub = onSnapshot(routeRef, (snap: any) => {
              if (snap.exists()) {
                  const data = snap.data();
                  setRouteInfo({
                      id: snap.id,
                      ...data,
                      date: data.date?.toDate ? data.date.toDate() : data.date
                  } as DeliveryRoute);
              }
          });
          return () => unsub();
      } else {
          setRouteInfo(null);
      }
  }, [job?.routeId, currentOrg]);

  const isAdmin = currentUser?.role === UserRole.ADMIN;
  const isManager = currentUser?.role === UserRole.MANAGER;
  const isTech = currentUser?.role === UserRole.COLLABORATOR;
  const isClient = currentUser?.role === UserRole.CLIENT;
  const isLabStaff = isAdmin || isManager || isTech;
  const canEdit = isAdmin || isManager;

  const [editDueDate, setEditDueDate] = useState('');
  const [editUrgency, setEditUrgency] = useState<UrgencyLevel>(UrgencyLevel.NORMAL);
  const [editNotes, setEditNotes] = useState('');
  const [editItems, setEditItems] = useState<JobItem[]>([]);
  const [newItemTypeId, setNewItemTypeId] = useState('');
  const [newItemQty, setNewItemQty] = useState(1);

  useEffect(() => {
    if (job) {
        setEditDueDate(new Date(job.dueDate).toISOString().split('T')[0]);
        setEditUrgency(job.urgency);
        setEditNotes(job.notes || '');
        setEditItems(job.items);
        if (jobTypes.length > 0) setNewItemTypeId(jobTypes[0].id);
    }
  }, [job, jobTypes]);

  if (!job) return <div className="flex flex-col items-center justify-center h-[60vh] text-center p-6"><h2 className="text-xl font-bold text-slate-800">Trabalho não encontrado</h2><button onClick={() => navigate('/jobs')} className="mt-4 text-blue-600 font-bold hover:underline">Voltar para lista</button></div>;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
          setSelectedFiles(Array.from(e.target.files));
      }
  };

  const handleUploadFiles = async () => {
    if (!job || selectedFiles.length === 0) return;
    setIsUploadingFiles(true);
    setUploadProgressMsg('Processando...');

    const newAttachments: Attachment[] = [];

    try {
        for (const file of selectedFiles) {
            setUploadProgressMsg(`Otimizando: ${file.name}`);
            const processed = await smartCompress(file);
            
            setUploadProgressMsg(`Enviando: ${file.name}`);
            const url = await uploadFile(processed);
            
            newAttachments.push({
                id: Math.random().toString(36).substr(2, 9),
                name: file.name,
                url: url,
                uploadedAt: new Date()
            });
        }

        const updatedAttachments = [...(job.attachments || []), ...newAttachments];
        await updateJob(job.id, { 
            attachments: updatedAttachments,
            history: [...job.history, {
                id: `hist_files_${Date.now()}`,
                timestamp: new Date(),
                action: `Anexados ${newAttachments.length} novos arquivos ao caso`,
                userId: currentUser?.id || 'sys',
                userName: currentUser?.name || 'Sistema'
            }]
        });

        setSelectedFiles([]);
        setUploadProgressMsg('');
        alert("Arquivos anexados!");
    } catch (err) {
        alert("Erro ao enviar arquivos.");
    } finally {
        setIsUploadingFiles(false);
    }
  };

  const handleAddItemToJob = () => {
      const type = jobTypes.find(t => t.id === newItemTypeId);
      if (!type) return;
      const newItem: JobItem = {
          id: `item_edit_${Date.now()}`,
          jobTypeId: type.id,
          name: type.name,
          quantity: newItemQty,
          price: type.basePrice,
          selectedVariationIds: [],
          nature: 'NORMAL'
      };
      setEditItems([...editItems, newItem]);
  };

  const handleRemoveItemFromJob = (itemId: string) => {
      setEditItems(editItems.filter(i => i.id !== itemId));
  };

  const handleToggleChat = async () => {
      if (!isLabStaff) return;
      const newState = !job.chatEnabled;
      await updateJob(job.id, { chatEnabled: newState });
  };

  const handleSaveChanges = async () => {
    if (!currentUser || !job) return;
    setIsUpdatingStatus(true);
    try {
        const newTotal = editItems.reduce((acc, i) => acc + (i.price * i.quantity), 0);
        const dateParts = editDueDate.split('-');
        const adjustedDate = new Date(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2]));

        await updateJob(job.id, {
            dueDate: adjustedDate,
            urgency: editUrgency,
            notes: editNotes,
            items: editItems,
            totalValue: newTotal,
            history: [...job.history, {
                id: `hist_edit_${Date.now()}`,
                timestamp: new Date(),
                action: 'Ficha editada manualmente',
                userId: currentUser.id,
                userName: currentUser.name,
                sector: 'Gestão'
            }]
        });
        setShowEditModal(false);
    } catch (err) {
        alert("Erro ao salvar.");
    } finally {
        setIsUpdatingStatus(false);
    }
  };

  const handleFinalizeJob = async () => {
    if (!currentUser || isUpdatingStatus) return;
    if (!window.confirm("Finalizar este caso agora?")) return;
    setIsUpdatingStatus(true);
    try {
        await updateJob(job.id, {
            status: JobStatus.COMPLETED,
            history: [...job.history, {
                id: `hist_fin_${Date.now()}`,
                timestamp: new Date(),
                action: `Trabalho Finalizado e Conferido`,
                userId: currentUser.id,
                userName: currentUser.name,
                sector: 'Expedição'
            }]
        });
    } finally { setIsUpdatingStatus(false); }
  };

  const handleReopenJob = async () => {
    if (!currentUser || isUpdatingStatus) return;
    if (!window.confirm("Deseja reabrir este caso?")) return;
    setIsUpdatingStatus(true);
    try {
        await updateJob(job.id, {
            status: JobStatus.IN_PROGRESS,
            history: [...job.history, {
                id: `hist_reopen_${Date.now()}`,
                timestamp: new Date(),
                action: `Trabalho REABERTO`,
                userId: currentUser.id,
                userName: currentUser.name,
                sector: currentUser.sector || 'Gestão'
            }]
        });
    } finally { setIsUpdatingStatus(false); }
  };

  const handleAddToRoute = async () => {
    if (!routeDriver) { alert("Informe o nome do motorista."); return; }
    setIsUpdatingStatus(true);
    try {
        await addJobToRoute(job, routeDriver, routeShift, new Date(routeDate));
        setShowRouteModal(false);
    } catch (err) {
        alert("Erro ao adicionar à rota.");
    } finally { setIsUpdatingStatus(false); }
  };

  const handleQuickStatusUpdate = async (newStatus: JobStatus) => {
    if (!currentUser || isUpdatingStatus) return;
    setIsUpdatingStatus(true);
    try {
        await updateJob(job.id, {
            status: newStatus,
            history: [...job.history, {
                id: `hist_stat_${Date.now()}`,
                timestamp: new Date(),
                action: `Status alterado: ${newStatus}`,
                userId: currentUser.id,
                userName: currentUser.name,
                sector: currentUser.sector || 'Geral'
            }]
        });
    } finally { setIsUpdatingStatus(false); }
  };

  const getStatusColor = (status: JobStatus) => {
      switch(status) {
          case JobStatus.COMPLETED: return 'bg-green-100 text-green-700 border-green-200';
          case JobStatus.DELIVERED: return 'bg-emerald-100 text-emerald-700 border-emerald-200';
          case JobStatus.IN_PROGRESS: return 'bg-blue-100 text-blue-700 border-blue-200';
          case JobStatus.WAITING_APPROVAL: return 'bg-purple-100 text-purple-700 border-purple-200';
          default: return 'bg-slate-100 text-slate-700 border-slate-200';
      }
  };

  const getFileIcon = (name: string) => {
      const ext = name.split('.').pop()?.toLowerCase();
      if (ext === 'stl') return <Box size={18} className="text-orange-500 shrink-0" />;
      if (['jpg', 'jpeg', 'png', 'webp'].includes(ext || '')) return <ImageIcon className="text-blue-500 shrink-0" size={18} />;
      if (ext === 'pdf') return <FileText className="text-red-500 shrink-0" size={18} />;
      if (['doc', 'docx'].includes(ext || '')) return <FileText className="text-blue-700 shrink-0" size={18} />;
      if (['xls', 'xlsx'].includes(ext || '')) return <FileSpreadsheet className="text-green-600 shrink-0" size={18} />;
      if (ext === 'html') return <FileCode className="text-purple-500 shrink-0" size={18} />;
      return <File className="text-slate-400 shrink-0" size={18} />;
  };

  const sortedHistory = [...job.history].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  const isFinished = job.status === JobStatus.COMPLETED || job.status === JobStatus.DELIVERED;
  const canFinalize = isLabStaff && !isFinished && job.status !== JobStatus.REJECTED;

  const showChatTab = isLabStaff || (isClient && job.chatEnabled);

  return (
    <div className="w-full space-y-4 md:space-y-6 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500 overflow-x-hidden">
      
      {show3DViewer && job.attachments && (
          <Suspense fallback={<div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center text-white"><Loader2 className="animate-spin mr-2"/> Carregando 3D...</div>}>
              <STLViewer files={job.attachments} onClose={() => setShow3DViewer(false)} />
          </Suspense>
      )}

      {showAlertModal && <CreateAlertModal job={job} onClose={() => setShowAlertModal(false)} />}
      
      {/* MODAL EDITAR - Mobile Responsive */}
      {showEditModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-2 sm:p-4">
              <div className="bg-white rounded-[24px] md:rounded-[32px] shadow-2xl w-full max-w-2xl max-h-[95vh] flex flex-col overflow-hidden animate-in zoom-in duration-200">
                  <div className="p-4 md:p-6 border-b flex justify-between items-center bg-slate-50 shrink-0">
                      <h3 className="text-lg md:text-xl font-bold text-slate-800 flex items-center gap-2"><Edit className="text-blue-600" /> Editar Ordem</h3>
                      <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-slate-600 p-1"><X size={24}/></button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 no-scrollbar">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Nova Entrega</label>
                              <input type="date" value={editDueDate} onChange={e => setEditDueDate(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold" />
                          </div>
                          <div>
                              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Prioridade</label>
                              <select value={editUrgency} onChange={e => setEditUrgency(e.target.value as UrgencyLevel)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold">
                                  <option value={UrgencyLevel.LOW}>Baixa</option>
                                  <option value={UrgencyLevel.NORMAL}>Normal</option>
                                  <option value={UrgencyLevel.HIGH}>Alta</option>
                                  <option value={UrgencyLevel.VIP}>VIP / Urgente</option>
                              </select>
                          </div>
                      </div>

                      <div className="space-y-3">
                          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 border-b border-slate-100 pb-1">Itens da OS</h4>
                          <div className="space-y-2">
                              {editItems.map(item => (
                                  <div key={item.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                                      <div className="text-xs font-bold text-slate-700 truncate mr-2">{item.quantity}x {item.name}</div>
                                      <button onClick={() => handleRemoveItemFromJob(item.id)} className="text-red-400 hover:text-red-600 shrink-0"><Trash2 size={16}/></button>
                                  </div>
                              ))}
                          </div>
                          <div className="flex flex-wrap gap-2 pt-2">
                              <div className="flex-1 min-w-[150px]">
                                  <select value={newItemTypeId} onChange={e => setNewItemTypeId(e.target.value)} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none">
                                      {jobTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                  </select>
                              </div>
                              <div className="w-16">
                                  <input type="number" value={newItemQty} onChange={e => setNewItemQty(parseInt(e.target.value) || 1)} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-center" />
                              </div>
                              <button onClick={handleAddItemToJob} className="p-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 shrink-0 shadow-md"><Plus size={18}/></button>
                          </div>
                      </div>

                      <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Observações Técnicas</label>
                          <textarea value={editNotes} onChange={e => setEditNotes(e.target.value)} rows={3} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl resize-none outline-none focus:ring-2 focus:ring-blue-500 text-xs font-medium" placeholder="Novas instruções..."></textarea>
                      </div>
                  </div>
                  <div className="p-4 md:p-6 border-t bg-slate-50 flex justify-end gap-3 shrink-0">
                      <button onClick={() => setShowEditModal(false)} className="px-5 py-2 font-black text-xs text-slate-400 uppercase tracking-widest">Cancelar</button>
                      <button onClick={handleSaveChanges} disabled={isUpdatingStatus} className="px-6 py-3 bg-blue-600 text-white font-black text-xs rounded-xl shadow-xl shadow-blue-100 hover:bg-blue-700 flex items-center gap-2 uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50">
                          {isUpdatingStatus ? <Loader2 className="animate-spin" size={16} /> : <><Save size={16} /> Salvar</>}
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* HEADER PRINCIPAL */}
      <div className="flex flex-col xs:flex-row justify-between items-start xs:items-center gap-3 shrink-0">
          <button onClick={() => navigate('/jobs')} className="flex items-center gap-2 text-slate-400 hover:text-slate-800 font-black text-[10px] uppercase tracking-widest transition-colors"><ArrowLeft size={16} /> Lista</button>
          <div className="flex flex-wrap gap-2 w-full xs:w-auto">
              {isFinished && isLabStaff && (
                  <button onClick={handleReopenJob} disabled={isUpdatingStatus} className="px-3 py-1.5 bg-amber-50 border border-amber-100 text-amber-600 rounded-lg hover:bg-amber-100 font-bold flex items-center gap-1.5 text-[9px] uppercase tracking-widest transition-all">
                    {isUpdatingStatus ? <Loader2 size={12} className="animate-spin" /> : <RotateCcw size={12} />} REABRIR
                  </button>
              )}
              {!isClient && job.status !== JobStatus.REJECTED && (
                  <>
                      <button onClick={() => triggerPrint(job, 'SHEET')} className="px-3 py-1.5 bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 font-bold flex items-center gap-1.5 text-[9px] uppercase tracking-widest shadow-sm"><Printer size={12} /> A4</button>
                      <button onClick={() => triggerPrint(job, 'LABEL')} className="px-3 py-1.5 bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 font-bold flex items-center gap-1.5 text-[9px] uppercase tracking-widest shadow-sm"><Printer size={12} /> Etiquetas</button>
                  </>
              )}
          </div>
      </div>

      {/* CARD PRINCIPAL INFO - Mobile Resilient */}
      <div className="bg-white rounded-[32px] shadow-sm border border-slate-100 p-5 md:p-8 relative overflow-hidden shrink-0">
         <div className={`absolute top-0 left-0 w-1.5 md:w-2 h-full ${job.urgency === UrgencyLevel.VIP ? 'bg-orange-500' : 'bg-blue-600'}`} />
         <div className="flex flex-col lg:flex-row justify-between items-start gap-6">
            <div className="w-full min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-3">
                    <span className="font-mono font-black text-2xl md:text-3xl text-slate-900 tracking-tight shrink-0">OS #{job.osNumber || '---'}</span>
                    <div className="relative group shrink-0">
                        <button className={`px-2.5 py-1 rounded-full text-[8px] md:text-[10px] font-black uppercase border flex items-center gap-1.5 ${getStatusColor(job.status)} shadow-sm`}>
                            {job.status} <ChevronDown size={10}/>
                        </button>
                        {!isClient && (
                            <div className="absolute top-full left-0 mt-2 w-44 bg-white border border-slate-200 rounded-xl shadow-2xl z-[60] hidden group-hover:block animate-in fade-in slide-in-from-top-2 overflow-hidden">
                                <div className="p-1.5 bg-slate-50 text-[8px] font-black text-slate-400 uppercase tracking-widest border-b">Alterar Status</div>
                                <div className="p-1 space-y-0.5">
                                    {Object.values(JobStatus).map(s => (
                                        <button key={s} onClick={() => handleQuickStatusUpdate(s)} className="w-full text-left px-3 py-1.5 text-[10px] font-bold text-slate-600 hover:bg-blue-600 hover:text-white rounded-lg transition-colors">{s}</button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className={`px-2.5 py-1 rounded-full text-[8px] md:text-[10px] font-black uppercase border flex items-center gap-1.5 shadow-sm ${
                        job.urgency === UrgencyLevel.VIP ? 'bg-orange-100 text-orange-700 border-orange-200' :
                        job.urgency === UrgencyLevel.HIGH ? 'bg-red-50 text-red-700 border-red-200' :
                        'bg-slate-50 text-slate-500 border-slate-200'
                    }`}>
                        {job.urgency === UrgencyLevel.VIP ? <Crown size={10}/> : <AlertTriangle size={10}/>}
                        {job.urgency}
                    </div>
                    
                    {isLabStaff && (
                         <button 
                            onClick={handleToggleChat}
                            className={`px-2.5 py-1 rounded-full text-[8px] md:text-[10px] font-black uppercase border flex items-center gap-1.5 transition-all shadow-sm ${job.chatEnabled ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-100 text-slate-400 border-slate-200'}`}
                        >
                            <MessageSquare size={10}/> {job.chatEnabled ? 'CHAT ATIVO' : 'CHAT OFF'}
                        </button>
                    )}
                </div>
                <h1 className="text-xl md:text-2xl font-black text-slate-800 leading-tight uppercase truncate">{job.patientName}</h1>
                <div className="flex items-center gap-2 text-slate-500 mt-1 font-bold text-xs uppercase truncate"><User size={14} className="text-blue-500 shrink-0" /> Dr(a). {job.dentistName}</div>
            </div>
            
            <div className="flex flex-col xs:flex-row lg:flex-col lg:items-end gap-3 w-full lg:w-auto mt-2 lg:mt-0 pt-4 lg:pt-0 border-t lg:border-t-0 border-slate-50">
                <div className="lg:text-right shrink-0">
                    <p className="text-[8px] md:text-[10px] text-slate-400 uppercase font-black tracking-widest leading-none mb-1">Previsão de Saída</p>
                    <div className="flex items-center lg:justify-end gap-1.5 text-sm md:text-lg font-black text-slate-800"><Calendar size={18} className="text-blue-600 shrink-0" /> {new Date(job.dueDate).toLocaleDateString()}</div>
                </div>
                
                <div className="flex flex-wrap gap-2 flex-1 lg:justify-end">
                    {canFinalize && (
                         <button onClick={handleFinalizeJob} disabled={isUpdatingStatus} className="flex-1 xs:flex-none px-4 py-2.5 bg-green-600 text-white font-black text-[10px] rounded-xl hover:bg-green-700 shadow-xl shadow-green-100 flex items-center justify-center gap-2 uppercase tracking-widest transition-all transform active:scale-95">
                            {isUpdatingStatus ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />} FINALIZAR
                        </button>
                    )}
                    {isFinished && isLabStaff && !job.routeId && (
                        <button onClick={() => setShowRouteModal(true)} className="flex-1 xs:flex-none px-4 py-2.5 bg-indigo-600 text-white font-black text-[10px] rounded-xl hover:bg-indigo-700 shadow-xl shadow-indigo-100 flex items-center justify-center gap-2 uppercase tracking-widest transition-all">
                            <Truck size={16} /> LOGÍSTICA
                        </button>
                    )}
                    {isLabStaff && (
                         <button onClick={() => setShowAlertModal(true)} className="flex-1 xs:flex-none px-4 py-2.5 bg-red-50 border border-red-100 text-red-600 rounded-xl font-bold flex items-center justify-center gap-2 text-[10px] uppercase tracking-widest transition-all hover:bg-red-100">
                            <Bell size={16} /> Alerta
                        </button>
                    )}
                    {canEdit && (
                        <button onClick={() => setShowEditModal(true)} className="flex-1 xs:flex-none px-4 py-2.5 bg-blue-50 border border-blue-100 text-blue-700 rounded-xl font-bold flex items-center justify-center gap-2 text-[10px] uppercase tracking-widest transition-all hover:bg-blue-100">
                            <Edit size={16} /> Editar
                        </button>
                    )}
                </div>
            </div>
         </div>
      </div>

      {/* ABAS COM OVERFLOW AUTO */}
      <div className="flex border-b border-slate-200 overflow-x-auto no-scrollbar shrink-0 sticky top-0 md:top-16 bg-slate-50 z-20 w-full">
         <button onClick={() => setActiveTab('SUMMARY')} className={`px-4 md:px-6 py-4 font-black text-[10px] md:text-xs uppercase tracking-widest flex items-center gap-2 transition-all whitespace-nowrap shrink-0 ${activeTab === 'SUMMARY' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}><FileText size={16} /> Resumo</button>
         <button onClick={() => setActiveTab('PRODUCTION')} className={`px-4 md:px-6 py-4 font-black text-[10px] md:text-xs uppercase tracking-widest flex items-center gap-2 transition-all whitespace-nowrap shrink-0 ${activeTab === 'PRODUCTION' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}><ListChecks size={16} /> Produção</button>
         {showChatTab && (
            <button onClick={() => setActiveTab('CHAT')} className={`px-4 md:px-6 py-4 font-black text-[10px] md:text-xs uppercase tracking-widest flex items-center gap-2 transition-all whitespace-nowrap shrink-0 ${activeTab === 'CHAT' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}>
                <MessageCircle size={16} /> Chat
                {job.chatEnabled && isLabStaff && <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse shrink-0"></div>}
            </button>
         )}
      </div>

      <div className="flex-1 min-h-0 w-full overflow-hidden">
        {activeTab === 'SUMMARY' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-8 animate-in fade-in duration-300 w-full pb-8">
                {/* KPI BOXES - Responsive Layout */}
                <div className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
                    <div className="bg-white p-4 md:p-5 rounded-2xl md:rounded-[32px] shadow-sm border border-slate-100 flex items-center gap-4">
                        <div className="p-3 bg-blue-50 text-blue-600 rounded-xl shrink-0"><Box size={24} /></div>
                        <div className="min-w-0">
                            <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest truncate">Caixa Física</p>
                            <div className="flex items-center gap-2">
                                <span className="font-black text-xl text-slate-800">{job.boxNumber || '--'}</span>
                                {job.boxColor && <div className="w-3.5 h-3.5 rounded-full shadow-sm border border-black/10 shrink-0" style={{ backgroundColor: job.boxColor.hex }} />}
                            </div>
                        </div>
                    </div>
                    <div className="bg-white p-4 md:p-5 rounded-2xl md:rounded-[32px] shadow-sm border border-slate-100 flex items-center gap-4">
                        <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl shrink-0"><MapPin size={24} /></div>
                        <div className="min-w-0">
                            <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest truncate">Localização Atual</p>
                            <p className="font-black text-lg text-slate-800 uppercase truncate">{job.currentSector || 'Triagem'}</p>
                        </div>
                    </div>
                    <div className="bg-white p-4 md:p-5 rounded-2xl md:rounded-[32px] shadow-sm border border-slate-100 flex items-center gap-4">
                        <div className="p-3 bg-green-50 text-green-600 rounded-xl shrink-0"><DollarSign size={24} /></div>
                        <div className="min-w-0">
                            <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest truncate">Orçamento</p>
                            <p className="font-black text-lg text-slate-800">R$ {job.totalValue.toFixed(2)}</p>
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-2 space-y-4 md:space-y-6 min-w-0">
                    {routeInfo && (
                        <div className="bg-indigo-50 rounded-[32px] shadow-sm border border-indigo-200 overflow-hidden animate-in slide-in-from-top-4">
                            <div className="bg-indigo-600 px-6 py-3 text-white flex justify-between items-center">
                                <div className="flex items-center gap-2 min-w-0">
                                    <Truck size={18} className="shrink-0" />
                                    <h3 className="font-black text-[10px] uppercase tracking-widest truncate">Logística de Entrega</h3>
                                </div>
                                <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase shrink-0 ${
                                    routeInfo.status === 'COMPLETED' ? 'bg-green-500' : 
                                    routeInfo.status === 'IN_TRANSIT' ? 'bg-orange-500 animate-pulse' : 'bg-indigo-400'
                                }`}>
                                    {routeInfo.status}
                                </span>
                            </div>
                            <div className="p-5 md:p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="flex items-center gap-4 min-w-0">
                                    <div className="p-3 bg-white rounded-xl shadow-sm text-indigo-600 border border-indigo-100 shrink-0"><User size={24}/></div>
                                    <div className="min-w-0">
                                        <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">Motorista</p>
                                        <p className="font-black text-indigo-900 text-base md:text-lg uppercase truncate">{routeInfo.driverName}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4 min-w-0">
                                    <div className="p-3 bg-white rounded-xl shadow-sm text-indigo-600 border border-indigo-100 shrink-0"><Navigation size={24}/></div>
                                    <div className="min-w-0">
                                        <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">Agendamento</p>
                                        <p className="font-black text-indigo-900 text-sm md:text-base truncate">
                                            {new Date(routeInfo.date).toLocaleDateString()} • {routeInfo.shift}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="bg-white rounded-[32px] shadow-sm border border-slate-100 p-5 md:p-8">
                        <h3 className="text-base md:text-lg font-black text-slate-800 mb-6 flex items-center gap-2 uppercase tracking-tighter shrink-0"><FileText size={20} className="text-blue-500 shrink-0" /> Itens do Pedido</h3>
                        <div className="divide-y divide-slate-100">
                            {job.items.map((item, idx) => (
                                <div key={idx} className="py-4 flex justify-between items-center gap-4 min-w-0">
                                    <div className="min-w-0 flex-1">
                                        <p className="font-black text-slate-800 text-sm md:text-base leading-tight truncate"><span className="text-blue-600 mr-1">{item.quantity}x</span> {item.name}</p>
                                        <p className="text-[9px] text-slate-400 uppercase font-black tracking-widest mt-1 truncate">{item.nature}</p>
                                    </div>
                                    <p className="font-black text-slate-600 text-sm md:text-base shrink-0">R$ {(item.price * item.quantity).toFixed(2)}</p>
                                </div>
                            ))}
                        </div>
                        <div className="mt-6 pt-6 border-t border-slate-200 text-right shrink-0">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-2">Valor Total da OS</span>
                            <div className="text-2xl md:text-3xl font-black text-slate-900 leading-none mt-1">R$ {job.totalValue.toFixed(2)}</div>
                        </div>
                    </div>

                    <div className="bg-white rounded-[32px] shadow-sm border border-slate-100 p-5 md:p-8">
                        <h3 className="text-base md:text-lg font-black text-slate-800 mb-4 flex items-center gap-2 uppercase tracking-tighter shrink-0"><File size={20} className="text-blue-500 shrink-0" /> Observações</h3>
                        <div className="bg-slate-50 p-4 rounded-2xl text-slate-600 text-xs md:text-sm font-medium leading-relaxed whitespace-pre-wrap min-h-[100px] border border-slate-100">
                            {job.notes || "Sem instruções adicionais registradas."}
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-1 space-y-4 md:space-y-6 min-w-0 pb-8">
                    <div className="bg-white rounded-[32px] shadow-sm border border-slate-100 p-5 md:p-6 overflow-hidden">
                        <div className="flex justify-between items-center mb-6 shrink-0">
                            <h3 className="text-sm md:text-base font-black text-slate-800 flex items-center gap-2 uppercase tracking-tighter truncate"><File size={20} className="text-blue-600 shrink-0" /> Documentos</h3>
                            <span className="text-[9px] font-black text-slate-400 uppercase bg-slate-50 px-2 py-0.5 rounded shrink-0">{job.attachments?.length || 0}</span>
                        </div>

                        <div className="space-y-4">
                            <div className="p-4 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50 group hover:border-blue-400 hover:bg-blue-50/50 transition-all text-center relative shrink-0">
                                <input type="file" multiple onChange={handleFileSelect} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" accept=".stl,.pdf,.doc,.docx,.xls,.xlsx,.html,.png,.jpg,.jpeg" />
                                <div className="flex flex-col items-center gap-2 pointer-events-none">
                                    <UploadCloud size={28} className="text-slate-300 group-hover:text-blue-500 transition-colors" />
                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Anexar Arquivos</span>
                                </div>
                            </div>

                            {selectedFiles.length > 0 && (
                                <div className="bg-blue-600 p-4 rounded-2xl shadow-xl shadow-blue-100 space-y-3 animate-in zoom-in shrink-0">
                                    <div className="space-y-1.5 max-h-32 overflow-y-auto no-scrollbar">
                                        {selectedFiles.map((f, i) => (
                                            <div key={i} className="flex justify-between items-center text-[10px] font-black text-white/80 uppercase tracking-tighter">
                                                <span className="truncate flex-1 pr-2">{f.name}</span>
                                                <button onClick={() => setSelectedFiles(prev => prev.filter((_, idx) => idx !== i))} className="p-1 hover:text-white shrink-0"><X size={14} /></button>
                                            </div>
                                        ))}
                                    </div>
                                    <button onClick={handleUploadFiles} disabled={isUploadingFiles} className="w-full py-2.5 bg-white text-blue-700 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-md flex items-center justify-center gap-2 active:scale-95 transition-transform disabled:opacity-50">
                                        {isUploadingFiles ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                                        {isUploadingFiles ? 'Enviando...' : 'Confirmar Envio'}
                                    </button>
                                    {uploadProgressMsg && <p className="text-[9px] text-white/60 text-center font-bold animate-pulse truncate">{uploadProgressMsg}</p>}
                                </div>
                            )}

                            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1 no-scrollbar shrink-0">
                                {job.attachments?.map(att => (
                                    <div key={att.id} className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-100 hover:border-blue-200 transition-all group overflow-hidden">
                                        <a href={att.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 overflow-hidden flex-1">
                                            {getFileIcon(att.name)}
                                            <div className="min-w-0">
                                                <p className="text-[10px] font-black text-slate-700 truncate uppercase tracking-tighter">{att.name}</p>
                                                <p className="text-[8px] text-slate-400 uppercase font-black tracking-widest">{new Date(att.uploadedAt).toLocaleDateString()}</p>
                                            </div>
                                        </a>
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <a href={att.url} download={att.name} className="p-2 text-slate-400 hover:text-blue-600 transition-colors"><Download size={14} /></a>
                                        </div>
                                    </div>
                                ))}
                                {(!job.attachments || job.attachments.length === 0) && <p className="text-xs text-slate-300 text-center py-12 italic border border-dashed rounded-[24px]">Sem mídias associadas.</p>}
                            </div>
                            
                            {job.attachments && job.attachments.some(a => a.name.toLowerCase().endsWith('.stl')) && (
                                <button onClick={() => setShow3DViewer(true)} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-slate-800 transition-all mt-2 text-[10px] uppercase tracking-widest shadow-xl shrink-0 active:scale-95">
                                    <Box size={20} className="shrink-0" /> Abrir Visualizador 3D
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        )}

        {activeTab === 'PRODUCTION' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-8 animate-in fade-in duration-300 w-full overflow-hidden pb-8">
                <div className="lg:col-span-2 min-w-0">
                    <div className="bg-white rounded-[32px] shadow-sm border border-slate-100 p-5 md:p-8">
                        <h3 className="text-base md:text-lg font-black text-slate-800 mb-8 flex items-center gap-2 uppercase tracking-tighter"><ListChecks size={20} className="text-blue-500 shrink-0" /> Linha do Tempo</h3>
                        <div className="space-y-8 relative before:absolute before:left-[17px] before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-50">
                            {sortedHistory.map((h, idx) => (
                                <div key={idx} className="flex gap-4 md:gap-6 relative min-w-0">
                                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 z-10 border-4 border-white shadow-sm ${idx === 0 ? 'bg-blue-600 text-white shadow-blue-100' : 'bg-slate-100 text-slate-300'}`}>
                                        {h.action.toLowerCase().includes('concluído') ? <Check size={16} className="shrink-0" /> : idx === 0 ? <Clock size={16} className="shrink-0" /> : <div className="w-2 h-2 bg-slate-300 rounded-full shrink-0" />}
                                    </div>
                                    <div className="flex-1 pb-8 border-b border-slate-50 last:border-0 last:pb-0 min-w-0">
                                        <div className="flex flex-col sm:flex-row justify-between items-start gap-1.5 md:gap-4 mb-2">
                                            <p className={`font-black text-xs md:text-sm uppercase tracking-tight leading-tight ${idx === 0 ? 'text-blue-600' : 'text-slate-700'}`}>{h.action}</p>
                                            <span className="text-[8px] md:text-[9px] font-black text-slate-400 uppercase bg-slate-100 px-2 py-0.5 rounded shrink-0 whitespace-nowrap">{new Date(h.timestamp).toLocaleDateString()} {new Date(h.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-3">
                                            <div className="flex items-center gap-1.5 text-[10px] md:text-xs text-slate-400 font-bold uppercase truncate"><User size={12} className="shrink-0" /> {h.userName}</div>
                                            {h.sector && <div className="flex items-center gap-1.5 text-[8px] md:text-[9px] font-black text-blue-500 uppercase tracking-widest bg-blue-50 px-2 py-0.5 rounded shrink-0">{h.sector}</div>}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                <div className="lg:col-span-1 space-y-4 md:space-y-6 min-w-0">
                     <div className="bg-indigo-900 rounded-[32px] shadow-xl p-6 md:p-8 text-white overflow-hidden relative min-h-[160px] flex flex-col justify-center shrink-0">
                        <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none"><Flag size={100} /></div>
                        <h4 className="font-black text-[10px] md:text-xs mb-2 flex items-center gap-2 uppercase tracking-widest text-indigo-300"><MapPin size={16} className="shrink-0" /> Estágio Atual</h4>
                        <p className="text-2xl md:text-3xl font-black uppercase tracking-tighter leading-tight break-words">{job.currentSector || 'Triagem'}</p>
                        <div className="mt-6 flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] text-indigo-400 shrink-0">
                            <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-ping shrink-0"></div> PRODUÇÃO EM CURSO
                        </div>
                    </div>
                </div>
            </div>
        )}

        {activeTab === 'CHAT' && showChatTab && (
            <div className="w-full animate-in fade-in zoom-in duration-300 pb-8">
                {job.chatEnabled || isLabStaff ? (
                    <div className="max-w-4xl mx-auto"><ChatSystem job={job} orgId={job.organizationId} /></div>
                ) : (
                    <div className="bg-white p-12 md:p-20 rounded-[32px] border border-slate-100 shadow-sm text-center">
                        <Lock size={48} className="mx-auto text-slate-200 mb-4 shrink-0" />
                        <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Chat Indisponível</h3>
                        <p className="text-slate-400 max-w-sm mx-auto mt-2 text-sm font-medium">Este laboratório ainda não liberou o canal de chat para este trabalho.</p>
                    </div>
                )}
            </div>
        )}
      </div>
    </div>
  );
};

const ImageIcon = ({ className, size }: { className?: string, size?: number }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size || 24} height={size || 24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
);
