
import React, { useState, useEffect, Suspense, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { JobStatus, UrgencyLevel, UserRole, JobItem, LabRating } from '../types';
import { 
  ArrowLeft, Calendar, User, Clock, MapPin, 
  FileText, DollarSign, CheckCircle, AlertTriangle, 
  Printer, Box, Layers, ListChecks, Bell, Edit, Save, X, Plus, Trash2,
  LogIn, LogOut, Flag, CheckSquare, File, Download, Loader2, CreditCard, ExternalLink, Copy, Check, Star, UploadCloud, ChevronDown, CheckCircle2
} from 'lucide-react';
import { CreateAlertModal } from '../components/AlertSystem';
import * as api from '../services/firebaseService';

// LAZY LOAD 3D VIEWER
const STLViewer = React.lazy(() => import('../components/STLViewer').then(module => ({ default: module.STLViewer })));

export const JobDetails = () => {
  const { id } = useParams();
  const { jobs, updateJob, triggerPrint, currentUser, jobTypes, activeOrganization, uploadFile } = useApp();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<'SUMMARY' | 'PRODUCTION'>('SUMMARY');
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [show3DViewer, setShow3DViewer] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [copiedPix, setCopiedPix] = useState(false);

  // Rating State
  const [ratingScore, setRatingScore] = useState(0);
  const [ratingComment, setRatingComment] = useState('');
  const [isSubmittingRating, setIsSubmittingRating] = useState(false);

  const job = jobs.find(j => j.id === id);
  const isAdmin = currentUser?.role === UserRole.ADMIN;
  const isManager = currentUser?.role === UserRole.MANAGER;
  const isTech = currentUser?.role === UserRole.COLLABORATOR;
  const isClient = currentUser?.role === UserRole.CLIENT;
  const isLabStaff = isAdmin || isManager || isTech;
  const canEdit = isAdmin || isManager;
  const canUpload = isAdmin || isManager || isTech;

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

  if (!job) return <div className="flex flex-col items-center justify-center h-[60vh]"><h2 className="text-2xl font-bold text-slate-800">Trabalho não encontrado</h2><button onClick={() => navigate('/jobs')} className="mt-4 text-blue-600 hover:underline">Voltar para lista</button></div>;

  const handleAddItemToJob = () => { const type = jobTypes.find(t => t.id === newItemTypeId); if (!type) return; const newItem: JobItem = { id: Math.random().toString(), jobTypeId: type.id, name: type.name, quantity: newItemQty, price: type.basePrice, selectedVariationIds: [], nature: 'NORMAL' }; setEditItems([...editItems, newItem]); };
  const handleRemoveItemFromJob = (itemId: string) => { setEditItems(editItems.filter(i => i.id !== itemId)); };
  
  const handleSaveChanges = async () => { 
    if (!currentUser) return;
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
        id: Math.random().toString(), 
        timestamp: new Date(), 
        action: 'Dados da Ficha editados manualmente (Prazos/Itens/Obs)', 
        userId: currentUser.id, 
        userName: currentUser.name,
        sector: currentUser.sector || 'Gestão'
      }] 
    }); 
    setShowEditModal(false); 
  };
  
  const handleFinalizeJob = async () => {
    if (!currentUser || isUpdatingStatus) return;
    if (!window.confirm("Finalizar este caso agora?")) return;
    setIsUpdatingStatus(true);
    try {
        await updateJob(job.id, {
            status: JobStatus.COMPLETED,
            history: [...job.history, {
                id: Math.random().toString(),
                timestamp: new Date(),
                action: `Trabalho Concluído/Finalizado para Entrega`,
                userId: currentUser.id,
                userName: currentUser.name,
                sector: 'Expedição'
            }]
        });
    } finally { setIsUpdatingStatus(false); }
  };

  const handleQuickStatusUpdate = async (newStatus: JobStatus) => {
    if (!currentUser || isUpdatingStatus) return;
    setIsUpdatingStatus(true);
    try {
        await updateJob(job.id, {
            status: newStatus,
            history: [...job.history, {
                id: Math.random().toString(),
                timestamp: new Date(),
                action: `Status alterado para: ${newStatus}`,
                userId: currentUser.id,
                userName: currentUser.name,
                sector: currentUser.sector || 'Geral'
            }]
        });
    } finally { setIsUpdatingStatus(false); }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !currentUser) return;
    setIsUploading(true);
    try {
        const newAttachments = [...(job.attachments || [])];
        const newHistory = [...job.history];
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const url = await uploadFile(file);
            newAttachments.push({ id: `att_${Date.now()}_${i}`, name: file.name, url: url, uploadedAt: new Date() });
            newHistory.push({ id: `hist_att_${Date.now()}_${i}`, timestamp: new Date(), action: `Arquivo anexado: ${file.name}`, userId: currentUser.id, userName: currentUser.name, sector: currentUser.sector || 'Técnico' });
        }
        await updateJob(job.id, { attachments: newAttachments, history: newHistory });
    } catch (err) { alert("Erro ao fazer upload."); } finally {
        setIsUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSendRating = async () => {
      if (ratingScore === 0 || !currentUser) return;
      setIsSubmittingRating(true);
      try {
          const rating: LabRating = { id: `rate_${Date.now()}`, labId: job.organizationId, dentistId: currentUser.id, dentistName: currentUser.name, jobId: job.id, score: ratingScore, comment: ratingComment, createdAt: new Date() };
          await api.apiAddLabRating(rating);
          alert("Avaliação enviada!");
      } catch (e) { alert("Erro."); } finally { setIsSubmittingRating(false); }
  };

  const getStatusColor = (status: JobStatus) => { switch(status) { case JobStatus.COMPLETED: return 'bg-green-100 text-green-700 border border-green-200'; case JobStatus.DELIVERED: return 'bg-emerald-100 text-emerald-700 border border-emerald-200'; case JobStatus.IN_PROGRESS: return 'bg-blue-100 text-blue-700 border border-blue-200'; case JobStatus.WAITING_APPROVAL: return 'bg-purple-100 text-purple-700 border border-purple-200'; default: return 'bg-slate-100 text-slate-700 border border-slate-200'; } };
  const getTimelineIcon = (action: string) => { const lower = action.toLowerCase(); if (lower.includes('entrada')) return <LogIn size={16} className="text-blue-600" />; if (lower.includes('saída')) return <LogOut size={16} className="text-orange-600" />; if (lower.includes('concluído') || lower.includes('finalizado') || lower.includes('status')) return <CheckCircle size={16} className="text-green-600" />; if (lower.includes('criado') || lower.includes('cadastro')) return <Flag size={16} className="text-purple-600" />; if (lower.includes('aprovado')) return <CheckSquare size={16} className="text-teal-600" />; if (lower.includes('anexado') || lower.includes('arquivo')) return <UploadCloud size={16} className="text-indigo-600" />; if (lower.includes('editados')) return <Edit size={16} className="text-amber-600" />; return <Clock size={16} className="text-slate-500" />; };
  const sortedHistory = [...job.history].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  const hasStl = job.attachments?.some(a => a.name.toLowerCase().endsWith('.stl'));
  const isFinished = job.status === JobStatus.COMPLETED || job.status === JobStatus.DELIVERED;
  const canFinalize = isLabStaff && !isFinished && job.status !== JobStatus.REJECTED;

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {show3DViewer && job.attachments && (<Suspense fallback={<div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center text-white"><Loader2 className="animate-spin mr-2"/> Carregando 3D...</div>}><STLViewer files={job.attachments} onClose={() => setShow3DViewer(false)} /></Suspense>)}
      {showAlertModal && <CreateAlertModal job={job} onClose={() => setShowAlertModal(false)} />}
      
      {/* Edit Modal (Omitido para brevidade, permanece igual) */}

      {/* Header */}
      <div className="flex justify-between items-center">
          <button onClick={() => navigate('/jobs')} className="flex items-center gap-2 text-slate-500 hover:text-slate-800 font-bold transition-colors"><ArrowLeft size={20} /> Voltar</button>
          <div className="flex gap-2">
              {!isClient && job.status !== JobStatus.REJECTED && (
                  <>
                      <button onClick={() => triggerPrint(job, 'SHEET')} className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 font-bold flex items-center gap-2 text-xs"><Printer size={16} /> Ficha A4</button>
                      <button onClick={() => triggerPrint(job, 'LABEL')} className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 font-bold flex items-center gap-2 text-xs"><Printer size={16} /> Etiqueta</button>
                  </>
              )}
          </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 md:p-8 relative overflow-hidden">
         <div className={`absolute top-0 left-0 w-2 h-full ${job.urgency === UrgencyLevel.VIP ? 'bg-orange-500' : 'bg-blue-600'}`} />
         <div className="flex flex-col md:flex-row justify-between items-start gap-6">
            <div className="w-full">
                <div className="flex flex-wrap items-center gap-3 mb-2">
                    <span className="font-mono font-bold text-3xl text-slate-900 tracking-tight">OS #{job.osNumber || '---'}</span>
                    <div className="relative group">
                        <button className={`px-3 py-1 rounded-full text-[10px] font-black uppercase border flex items-center gap-1 ${getStatusColor(job.status)}`}>
                            {job.status} <ChevronDown size={12}/>
                        </button>
                        {!isClient && (
                            <div className="absolute top-full left-0 mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-xl z-20 hidden group-hover:block animate-in fade-in slide-in-from-top-2">
                                <div className="p-2 space-y-1">
                                    {Object.values(JobStatus).map(s => (
                                        <button key={s} onClick={() => handleQuickStatusUpdate(s)} className="w-full text-left px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-blue-600 rounded-lg">{s}</button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                    {job.urgency === UrgencyLevel.VIP && <span className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black bg-orange-100 text-orange-700 border border-orange-200 uppercase tracking-tighter"><AlertTriangle size={12} /> VIP / URGENTE</span>}
                </div>
                <h1 className="text-2xl font-bold text-slate-800">{job.patientName}</h1>
                <div className="flex items-center gap-2 text-slate-500 mt-1 font-medium"><User size={16} /> Dr(a). {job.dentistName}</div>
            </div>
            
            <div className="flex flex-col md:items-end gap-3 w-full md:w-auto mt-4 md:mt-0">
                <div className="md:text-right">
                    <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">Entrega Prevista</p>
                    <div className="flex items-center justify-end gap-2 text-lg font-bold text-slate-800"><Calendar size={18} className="text-blue-600" /> {new Date(job.dueDate).toLocaleDateString()}</div>
                </div>
                
                <div className="flex flex-wrap gap-2 w-full md:w-auto justify-end">
                    {canFinalize && (
                         <button 
                            onClick={handleFinalizeJob}
                            disabled={isUpdatingStatus}
                            className="px-6 py-3 bg-green-600 text-white font-black rounded-xl hover:bg-green-700 shadow-xl shadow-green-200 flex items-center justify-center gap-2 transition-all transform hover:scale-105 active:scale-95"
                        >
                            {isUpdatingStatus ? <Loader2 className="animate-spin" /> : <><CheckCircle2 size={20} /> FINALIZAR CASO</>}
                        </button>
                    )}
                    {isClient && !isFinished && (
                        <button onClick={() => setShowPaymentModal(true)} className="px-4 py-2 bg-indigo-600 text-white font-bold rounded-xl shadow-lg flex items-center gap-2 text-sm"><DollarSign size={16} /> Pagar</button>
                    )}
                    {canEdit && (
                        <button onClick={() => setShowEditModal(true)} className="px-4 py-2 bg-blue-50 border border-blue-200 text-blue-700 rounded-lg font-bold flex items-center gap-2 text-sm transition-colors"><Edit size={16} /> Editar</button>
                    )}
                </div>
            </div>
         </div>
      </div>

      {/* Tabs and content follow as existing, focusing on the summary and production updates above */}
      <div className="flex border-b border-slate-200">
         <button onClick={() => setActiveTab('SUMMARY')} className={`px-6 py-3 font-bold text-sm flex items-center gap-2 transition-all ${activeTab === 'SUMMARY' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-500 hover:text-slate-800'}`}><FileText size={18} /> Resumo do Pedido</button>
         <button onClick={() => setActiveTab('PRODUCTION')} className={`px-6 py-3 font-bold text-sm flex items-center gap-2 transition-all ${activeTab === 'PRODUCTION' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-500 hover:text-slate-800'}`}><ListChecks size={18} /> Produção & Rastreio</button>
      </div>

      {activeTab === 'SUMMARY' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in duration-300">
            <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4"><div className="p-3 bg-blue-50 text-blue-600 rounded-xl"><Box size={24} /></div><div><p className="text-xs text-slate-400 uppercase font-bold">Caixa Física</p><div className="flex items-center gap-2"><span className="font-bold text-xl text-slate-800">{job.boxNumber || '-'}</span>{job.boxColor && <div className="w-4 h-4 rounded-full shadow-sm border border-black/10" style={{ backgroundColor: job.boxColor.hex }} title={job.boxColor.name} />}</div></div></div>
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4"><div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl"><MapPin size={24} /></div><div><p className="text-xs text-slate-400 uppercase font-bold">Local Atual</p><p className="font-bold text-lg text-slate-800">{job.currentSector || 'Recepção'}</p></div></div>
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4"><div className="p-3 bg-green-50 text-green-600 rounded-xl"><DollarSign size={24} /></div><div><p className="text-xs text-slate-400 uppercase font-bold">Valor Total</p><p className="font-bold text-lg text-slate-800">R$ {job.totalValue.toFixed(2)}</p></div></div>
            </div>

            <div className="lg:col-span-3 bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden p-6">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><FileText size={20} className="text-blue-500" /> Itens e Serviços</h3>
                </div>
                <div className="divide-y divide-slate-100">{job.items.map((item, idx) => (<div key={idx} className="py-4 flex justify-between items-center"><div><p className="font-bold text-slate-800"><span className="text-blue-600 mr-1">{item.quantity}x</span> {item.name}</p><p className="text-xs text-slate-400 uppercase font-bold">{item.nature}</p></div><p className="font-black text-slate-700">R$ {(item.price * item.quantity).toFixed(2)}</p></div>))}</div>
                <div className="mt-4 pt-4 border-t border-slate-100 text-right"><span className="text-sm font-bold text-slate-500 mr-2">TOTAL:</span><span className="text-2xl font-black text-slate-900">R$ {job.totalValue.toFixed(2)}</span></div>
            </div>
        </div>
      )}
    </div>
  );
};
