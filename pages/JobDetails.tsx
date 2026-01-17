import React, { useState, useEffect, Suspense, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { JobStatus, UrgencyLevel, UserRole, JobItem, LabRating, Job, DeliveryRoute } from '../types';
import { 
  ArrowLeft, Calendar, User, Clock, MapPin, 
  FileText, DollarSign, CheckCircle, AlertTriangle, 
  Printer, Box, Layers, ListChecks, Bell, Edit, Save, X, Plus, Trash2,
  LogIn, LogOut, Flag, CheckSquare, File, Download, Loader2, CreditCard, ExternalLink, Copy, Check, Star, UploadCloud, ChevronDown, CheckCircle2, Truck, Navigation, RotateCcw, MessageCircle, MessageSquare
} from 'lucide-react';
import { CreateAlertModal } from '../components/AlertSystem';
import { ChatSystem } from '../components/ChatSystem';
import * as api from '../services/firebaseService';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebaseConfig';

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
  const [isUploading, setIsUploading] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  
  const [routeInfo, setRouteInfo] = useState<DeliveryRoute | null>(null);

  const [routeDriver, setRouteDriver] = useState('');
  const [routeShift, setRouteShift] = useState<'MORNING' | 'AFTERNOON'>('MORNING');
  const [routeDate, setRouteDate] = useState(new Date().toISOString().split('T')[0]);

  const job = jobs.find(j => j.id === id);
  
  useEffect(() => {
      if (job?.routeId && currentOrg) {
          const routeRef = doc(db, 'organizations', currentOrg.id, 'routes', job.routeId);
          const unsub = onSnapshot(routeRef, (snap) => {
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

  if (!job) return <div className="flex flex-col items-center justify-center h-[60vh]"><h2 className="text-2xl font-bold text-slate-800">Trabalho não encontrado</h2><button onClick={() => navigate('/jobs')} className="mt-4 text-blue-600 hover:underline">Voltar para lista</button></div>;

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
      alert(newState ? "Chat liberado para o cliente!" : "Chat desativado para este caso.");
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
                action: 'Ficha editada manualmente (Datas/Itens/Obs)',
                userId: currentUser.id,
                userName: currentUser.name,
                sector: 'Gestão'
            }]
        });
        setShowEditModal(false);
        alert("Alterações salvas com sucesso!");
    } catch (err) {
        alert("Erro ao salvar edições.");
    } finally {
        setIsUpdatingStatus(false);
    }
  };

  const handleFinalizeJob = async () => {
    if (!currentUser || isUpdatingStatus) return;
    if (!window.confirm("Finalizar este caso agora? O trabalho será enviado para o financeiro como débito do dentista.")) return;
    setIsUpdatingStatus(true);
    try {
        await updateJob(job.id, {
            status: JobStatus.COMPLETED,
            history: [...job.history, {
                id: `hist_fin_${Date.now()}`,
                timestamp: new Date(),
                action: `Trabalho Finalizado e Conferido (Pronto para Entrega/Faturamento)`,
                userId: currentUser.id,
                userName: currentUser.name,
                sector: 'Expedição'
            }]
        });
    } finally { setIsUpdatingStatus(false); }
  };

  const handleReopenJob = async () => {
    if (!currentUser || isUpdatingStatus) return;
    if (!window.confirm("Deseja reabrir este caso? O status voltará para 'Em Produção' e ele sairá da lista de concluídos.")) return;
    setIsUpdatingStatus(true);
    try {
        await updateJob(job.id, {
            status: JobStatus.IN_PROGRESS,
            history: [...job.history, {
                id: `hist_reopen_${Date.now()}`,
                timestamp: new Date(),
                action: `Trabalho REABERTO (Retorno à Produção)`,
                userId: currentUser.id,
                userName: currentUser.name,
                sector: currentUser.sector || 'Gestão'
            }]
        });
        alert("Caso reaberto com sucesso!");
    } finally { setIsUpdatingStatus(false); }
  };

  const handleAddToRoute = async () => {
    if (!routeDriver) { alert("Informe o nome do motorista."); return; }
    setIsUpdatingStatus(true);
    try {
        await addJobToRoute(job, routeDriver, routeShift, new Date(routeDate));
        setShowRouteModal(false);
        alert("Trabalho adicionado ao roteiro!");
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
                action: `Status alterado para: ${newStatus}`,
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

  const sortedHistory = [...job.history].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  const isFinished = job.status === JobStatus.COMPLETED || job.status === JobStatus.DELIVERED;
  const canFinalize = isLabStaff && !isFinished && job.status !== JobStatus.REJECTED;

  const showChatTab = isLabStaff || (isClient && job.chatEnabled);

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {show3DViewer && job.attachments && (
          <Suspense fallback={<div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center text-white"><Loader2 className="animate-spin mr-2"/> Carregando 3D...</div>}>
              <STLViewer files={job.attachments} onClose={() => setShow3DViewer(false)} />
          </Suspense>
      )}

      {showAlertModal && <CreateAlertModal job={job} onClose={() => setShowAlertModal(false)} />}
      
      {showEditModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
              <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in duration-200">
                  <div className="p-6 border-b flex justify-between items-center bg-slate-50">
                      <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2"><Edit className="text-blue-600" /> Editar Ordem de Serviço</h3>
                      <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-slate-600"><X size={24}/></button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-6 space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nova Data de Entrega</label>
                              <input type="date" value={editDueDate} onChange={e => setEditDueDate(e.target.value)} className="w-full px-4 py-2 border rounded-xl" />
                          </div>
                          <div>
                              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Prioridade</label>
                              <select value={editUrgency} onChange={e => setEditUrgency(e.target.value as UrgencyLevel)} className="w-full px-4 py-2 border rounded-xl bg-white">
                                  <option value={UrgencyLevel.LOW}>Baixa</option>
                                  <option value={UrgencyLevel.NORMAL}>Normal</option>
                                  <option value={UrgencyLevel.HIGH}>Alta</option>
                                  <option value={UrgencyLevel.VIP}>VIP / Urgente</option>
                              </select>
                          </div>
                      </div>

                      <div className="space-y-3">
                          <h4 className="font-bold text-slate-700 text-sm border-b pb-1 uppercase">Itens da OS</h4>
                          <div className="space-y-2">
                              {editItems.map(item => (
                                  <div key={item.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border">
                                      <div className="text-sm font-bold text-slate-700">{item.quantity}x {item.name}</div>
                                      <button onClick={() => handleRemoveItemFromJob(item.id)} className="text-red-400 hover:text-red-600"><Trash2 size={18}/></button>
                                  </div>
                              ))}
                          </div>
                          <div className="flex gap-2 items-end pt-2">
                              <div className="flex-1">
                                  <label className="text-[10px] font-bold text-slate-400 block mb-1 uppercase">Adicionar Serviço</label>
                                  <select value={newItemTypeId} onChange={e => setNewItemTypeId(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm bg-white">
                                      {jobTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                  </select>
                              </div>
                              <div className="w-16">
                                  <label className="text-[10px] font-bold text-slate-400 block mb-1 uppercase">Qtd</label>
                                  <input type="number" value={newItemQty} onChange={e => setNewItemQty(parseInt(e.target.value) || 1)} className="w-full px-3 py-2 border rounded-lg text-sm" />
                              </div>
                              <button onClick={handleAddItemToJob} className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"><Plus size={20}/></button>
                          </div>
                      </div>

                      <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Observações / Instruções</label>
                          <textarea value={editNotes} onChange={e => setEditNotes(e.target.value)} rows={4} className="w-full px-4 py-3 border rounded-xl resize-none" placeholder="Atualize as instruções para os técnicos..."></textarea>
                      </div>
                  </div>
                  <div className="p-6 border-t bg-slate-50 flex justify-end gap-3">
                      <button onClick={() => setShowEditModal(false)} className="px-6 py-2 font-bold text-slate-500">Cancelar</button>
                      <button onClick={handleSaveChanges} disabled={isUpdatingStatus} className="px-8 py-2 bg-blue-600 text-white font-bold rounded-xl shadow-lg hover:bg-blue-700 flex items-center gap-2">
                          {isUpdatingStatus ? <Loader2 className="animate-spin" /> : <><Save size={18} /> Salvar Alterações</>}
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* MODAL: ADICIONAR À ROTA */}
      {showRouteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
              <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 animate-in zoom-in duration-200">
                  <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
                      <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2"><Truck className="text-indigo-600" /> Escalar para Entrega</h3>
                      <button onClick={() => setShowRouteModal(false)} className="text-slate-400 hover:text-slate-600"><X size={24}/></button>
                  </div>
                  <div className="space-y-4">
                      <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Data da Rota</label>
                          <input type="date" value={routeDate} onChange={e => setRouteDate(e.target.value)} className="w-full px-4 py-2 border rounded-xl outline-none" />
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Turno</label>
                          <div className="grid grid-cols-2 gap-2">
                              <button onClick={() => setRouteShift('MORNING')} className={`py-2 text-xs font-bold rounded-xl border-2 transition-all ${routeShift === 'MORNING' ? 'bg-indigo-50 border-indigo-600 text-indigo-700' : 'border-slate-100 text-slate-400'}`}>Manhã</button>
                              <button onClick={() => setRouteShift('AFTERNOON')} className={`py-2 text-xs font-bold rounded-xl border-2 transition-all ${routeShift === 'AFTERNOON' ? 'bg-indigo-50 border-indigo-600 text-indigo-700' : 'border-slate-100 text-slate-400'}`}>Tarde</button>
                          </div>
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Entregador / Motoboy</label>
                          <input placeholder="Nome do Motoboy" value={routeDriver} onChange={e => setRouteDriver(e.target.value)} className="w-full px-4 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" />
                      </div>

                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                          <p className="text-[10px] font-black text-slate-400 uppercase">Destinatário</p>
                          <p className="font-bold text-slate-800">{job.dentistName}</p>
                          <p className="text-xs text-slate-500 line-clamp-1">{job.patientName ? `Paciente: ${job.patientName}` : 'Sem paciente vinculado'}</p>
                      </div>

                      <button onClick={handleAddToRoute} disabled={isUpdatingStatus} className="w-full py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-xl hover:bg-indigo-700 flex items-center justify-center gap-2">
                          {isUpdatingStatus ? <Loader2 className="animate-spin" /> : <><CheckCircle2 size={20} /> CONFIRMAR NO ROTEIRO</>}
                      </button>
                  </div>
              </div>
          </div>
      )}

      <div className="flex justify-between items-center">
          <button onClick={() => navigate('/jobs')} className="flex items-center gap-2 text-slate-500 hover:text-slate-800 font-bold transition-colors"><ArrowLeft size={20} /> Voltar para Lista</button>
          <div className="flex gap-2">
              {isFinished && isLabStaff && (
                  <button 
                    onClick={handleReopenJob} 
                    disabled={isUpdatingStatus}
                    className="px-4 py-2 bg-amber-50 border border-amber-200 text-amber-700 rounded-lg hover:bg-amber-100 font-bold flex items-center gap-2 text-xs transition-all shadow-sm"
                  >
                    {isUpdatingStatus ? <Loader2 size={16} className="animate-spin" /> : <RotateCcw size={16} />} 
                    REABRIR CASO
                  </button>
              )}
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
                    
                    {/* CHAT STATUS INDICATOR */}
                    {isLabStaff && (
                         <button 
                            onClick={handleToggleChat}
                            className={`px-3 py-1 rounded-full text-[10px] font-black uppercase border flex items-center gap-1.5 transition-all ${job.chatEnabled ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-100 text-slate-400 border-slate-200'}`}
                        >
                            <MessageSquare size={12}/> {job.chatEnabled ? 'Chat Ativo' : 'Chat Offline'}
                        </button>
                    )}
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

                    {isFinished && isLabStaff && !job.routeId && (
                        <button 
                            onClick={() => setShowRouteModal(true)}
                            className="px-6 py-3 bg-indigo-600 text-white font-black rounded-xl hover:bg-indigo-700 shadow-xl shadow-indigo-100 flex items-center justify-center gap-2 transition-all transform hover:scale-105"
                        >
                            <Truck size={20} /> ADICIONAR À ROTA
                        </button>
                    )}
                    
                    {isLabStaff && (
                         <button 
                            onClick={() => setShowAlertModal(true)}
                            className="px-4 py-3 bg-red-50 border border-red-200 text-red-600 rounded-xl font-bold flex items-center gap-2 text-sm transition-colors hover:bg-red-100 shadow-sm"
                        >
                            <Bell size={18} /> Alerta
                        </button>
                    )}

                    {canEdit && (
                        <button 
                            onClick={() => setShowEditModal(true)} 
                            className="px-4 py-3 bg-blue-50 border border-blue-200 text-blue-700 rounded-xl font-bold flex items-center gap-2 text-sm transition-colors hover:bg-blue-100 shadow-sm"
                        >
                            <Edit size={18} /> Editar Ficha
                        </button>
                    )}
                </div>
            </div>
         </div>
      </div>

      <div className="flex border-b border-slate-200 overflow-x-auto no-scrollbar">
         <button onClick={() => setActiveTab('SUMMARY')} className={`px-6 py-3 font-bold text-sm flex items-center gap-2 transition-all whitespace-nowrap ${activeTab === 'SUMMARY' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-500 hover:text-slate-800'}`}><FileText size={18} /> Resumo</button>
         <button onClick={() => setActiveTab('PRODUCTION')} className={`px-6 py-3 font-bold text-sm flex items-center gap-2 transition-all whitespace-nowrap ${activeTab === 'PRODUCTION' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-500 hover:text-slate-800'}`}><ListChecks size={18} /> Produção</button>
         
         {showChatTab && (
            <button onClick={() => setActiveTab('CHAT')} className={`px-6 py-3 font-bold text-sm flex items-center gap-2 transition-all whitespace-nowrap ${activeTab === 'CHAT' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-500 hover:text-slate-800'}`}>
                <MessageCircle size={18} /> Chat do Trabalho
                {job.chatEnabled && isLabStaff && <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>}
            </button>
         )}
      </div>

      {activeTab === 'SUMMARY' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in duration-300">
            <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4"><div className="p-3 bg-blue-50 text-blue-600 rounded-xl"><Box size={24} /></div><div><p className="text-xs text-slate-400 uppercase font-bold">Caixa Física</p><div className="flex items-center gap-2"><span className="font-bold text-xl text-slate-800">{job.boxNumber || '-'}</span>{job.boxColor && <div className="w-4 h-4 rounded-full shadow-sm border border-black/10" style={{ backgroundColor: job.boxColor.hex }} title={job.boxColor.name} />}</div></div></div>
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4"><div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl"><MapPin size={24} /></div><div><p className="text-xs text-slate-400 uppercase font-bold">Local Atual</p><p className="font-bold text-lg text-slate-800">{job.currentSector || 'Recepção'}</p></div></div>
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4"><div className="p-3 bg-green-50 text-green-600 rounded-xl"><DollarSign size={24} /></div><div><p className="text-xs text-slate-400 uppercase font-bold">Valor Total</p><p className="font-bold text-lg text-slate-800">R$ {job.totalValue.toFixed(2)}</p></div></div>
            </div>

            <div className="lg:col-span-2 space-y-6">
                {/* LOGISTICS CARD */}
                {routeInfo && (
                    <div className="bg-indigo-50 rounded-2xl shadow-sm border border-indigo-200 overflow-hidden animate-in slide-in-from-top-4">
                        <div className="bg-indigo-600 px-6 py-3 text-white flex justify-between items-center">
                            <div className="flex items-center gap-2">
                                <Truck size={20} />
                                <h3 className="font-black text-sm uppercase tracking-widest">Logística de Entrega</h3>
                            </div>
                            <span className={`px-2 py-1 rounded text-[10px] font-black uppercase ${
                                routeInfo.status === 'COMPLETED' ? 'bg-green-500' : 
                                routeInfo.status === 'IN_TRANSIT' ? 'bg-orange-500 animate-pulse' : 'bg-indigo-400'
                            }`}>
                                {routeInfo.status === 'COMPLETED' ? 'Finalizada' : 
                                 routeInfo.status === 'IN_TRANSIT' ? 'Em Rota' : 'Aguardando Saída'}
                            </span>
                        </div>
                        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-white rounded-xl shadow-sm text-indigo-600 border border-indigo-100"><User size={24}/></div>
                                <div>
                                    <p className="text-[10px] font-black text-indigo-400 uppercase">Entregador Responsável</p>
                                    <p className="font-black text-indigo-900 text-lg uppercase">{routeInfo.driverName}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-white rounded-xl shadow-sm text-indigo-600 border border-indigo-100"><Navigation size={24}/></div>
                                <div>
                                    <p className="text-[10px] font-black text-indigo-400 uppercase">Programação</p>
                                    <p className="font-black text-indigo-900 text-lg">
                                        {new Date(routeInfo.date).toLocaleDateString()} • {routeInfo.shift === 'MORNING' ? 'Manhã' : 'Tarde'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden p-6">
                    <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2"><FileText size={20} className="text-blue-500" /> Itens e Serviços</h3>
                    <div className="divide-y divide-slate-100">
                        {job.items.map((item, idx) => (
                            <div key={idx} className="py-4 flex justify-between items-center">
                                <div>
                                    <p className="font-bold text-slate-800"><span className="text-blue-600 mr-1">{item.quantity}x</span> {item.name}</p>
                                    <p className="text-xs text-slate-400 uppercase font-bold">{item.nature}</p>
                                </div>
                                <p className="font-black text-slate-700">R$ {(item.price * item.quantity).toFixed(2)}</p>
                            </div>
                        ))}
                    </div>
                    <div className="mt-4 pt-4 border-t border-slate-100 text-right">
                        <span className="text-sm font-bold text-slate-500 mr-2">TOTAL DA OS:</span>
                        <span className="text-2xl font-black text-slate-900">R$ {job.totalValue.toFixed(2)}</span>
                    </div>
                </div>
            </div>

            <div className="lg:col-span-1 space-y-6">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                    <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2"><File size={20} className="text-blue-500" /> Anexos Digitais</h3>
                    <div className="space-y-3">
                        {job.attachments?.map(att => (
                            <a key={att.id} href={att.url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200 hover:bg-blue-50 transition-colors group">
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <File size={18} className="text-slate-400 group-hover:text-blue-500" />
                                    <span className="text-sm font-bold text-slate-700 truncate">{att.name}</span>
                                </div>
                                <Download size={16} className="text-slate-400" />
                            </a>
                        ))}
                        {(!job.attachments || job.attachments.length === 0) && <p className="text-sm text-slate-400 text-center py-4 italic">Nenhum arquivo anexado.</p>}
                        
                        {job.attachments && job.attachments.some(a => a.name.toLowerCase().endsWith('.stl')) && (
                            <button onClick={() => setShow3DViewer(true)} className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-800 transition-all mt-4">
                                <Box size={18} /> Visualizador 3D (STL)
                            </button>
                        )}
                    </div>
                </div>
                
                {/* CHAT PREVIEW / PROMPT FOR LAB */}
                {isLabStaff && !job.chatEnabled && (
                    <div className="bg-blue-50 border border-blue-200 p-6 rounded-2xl text-center">
                        <MessageSquare size={32} className="mx-auto text-blue-400 mb-3" />
                        <h4 className="font-bold text-blue-800 mb-2">Comunicação Direta</h4>
                        <p className="text-xs text-blue-600 mb-4">Deseja liberar o chat para este dentista tirar dúvidas ou enviar novos arquivos?</p>
                        <button 
                            onClick={handleToggleChat}
                            className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-md transition-all"
                        >
                            ATIVAR CHAT AGORA
                        </button>
                    </div>
                )}
            </div>
        </div>
      )}

      {activeTab === 'PRODUCTION' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in duration-300">
            <div className="lg:col-span-2">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                    <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2"><ListChecks size={20} className="text-blue-500" /> Linha do Tempo</h3>
                    <div className="space-y-6 relative before:absolute before:left-[17px] before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100">
                        {sortedHistory.map((h, idx) => (
                            <div key={idx} className="flex gap-4 relative">
                                <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 z-10 border-4 border-white ${idx === 0 ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-100 text-slate-400'}`}>
                                    {h.action.toLowerCase().includes('concluído') ? <Check size={16} /> : idx === 0 ? <Clock size={16} /> : <div className="w-2 h-2 bg-slate-300 rounded-full" />}
                                </div>
                                <div className="flex-1 pb-6 border-b border-slate-50 last:border-0 last:pb-0">
                                    <div className="flex justify-between items-start">
                                        <p className={`font-bold ${idx === 0 ? 'text-blue-600' : 'text-slate-800'}`}>{h.action}</p>
                                        <span className="text-[10px] font-black text-slate-400 uppercase bg-slate-50 px-2 py-0.5 rounded">{new Date(h.timestamp).toLocaleDateString()} {new Date(h.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>
                                    <div className="flex items-center gap-3 mt-2">
                                        <div className="flex items-center gap-1 text-xs text-slate-500"><User size={12} /> {h.userName}</div>
                                        {h.sector && <div className="flex items-center gap-1 text-xs font-black text-slate-400 uppercase tracking-tighter bg-slate-100 px-1.5 rounded">{h.sector}</div>}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
            <div className="lg:col-span-1 space-y-6">
                 <div className="bg-indigo-900 rounded-2xl shadow-xl p-6 text-white overflow-hidden relative">
                    <div className="absolute top-0 right-0 p-4 opacity-10"><Flag size={80} /></div>
                    <h4 className="font-bold text-lg mb-2 flex items-center gap-2"><MapPin size={18} /> Estágio Atual</h4>
                    <p className="text-3xl font-black mb-4 uppercase">{job.currentSector || 'Triagem / Entrada'}</p>
                </div>
            </div>
        </div>
      )}

      {activeTab === 'CHAT' && showChatTab && (
          <div className="animate-in fade-in zoom-in duration-300">
              {job.chatEnabled || isLabStaff ? (
                  <ChatSystem job={job} orgId={job.organizationId} />
              ) : (
                  <div className="bg-white p-20 rounded-3xl border border-slate-100 shadow-sm text-center">
                      <Lock size={48} className="mx-auto text-slate-200 mb-4" />
                      <h3 className="text-xl font-bold text-slate-800">Chat Indisponível</h3>
                      <p className="text-slate-500 max-w-sm mx-auto mt-2">Este laboratório ainda não liberou o canal de chat para este trabalho específico.</p>
                  </div>
              )}
          </div>
      )}
    </div>
  );
};