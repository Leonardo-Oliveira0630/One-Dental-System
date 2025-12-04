import React, { useState, useEffect, Suspense } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { JobStatus, UrgencyLevel, UserRole, JobItem } from '../types';
import { 
  ArrowLeft, Calendar, User, Clock, MapPin, 
  FileText, DollarSign, CheckCircle, AlertTriangle, 
  Printer, Box, Layers, ListChecks, Bell, Edit, Save, X, Plus, Trash2,
  LogIn, LogOut, Flag, CheckSquare, File, Download, Loader2, CreditCard, ExternalLink, Copy, Check
} from 'lucide-react';
import { CreateAlertModal } from '../components/AlertSystem';

// LAZY LOAD 3D VIEWER
const STLViewer = React.lazy(() => import('../components/STLViewer').then(module => ({ default: module.STLViewer })));

export const JobDetails = () => {
  const { id } = useParams();
  const { jobs, updateJob, triggerPrint, currentUser, jobTypes, activeOrganization } = useApp();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'SUMMARY' | 'PRODUCTION'>('SUMMARY');
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [show3DViewer, setShow3DViewer] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [copiedPix, setCopiedPix] = useState(false);

  const job = jobs.find(j => j.id === id);
  const canManage = currentUser?.role === UserRole.MANAGER || currentUser?.role === UserRole.ADMIN;
  const isClient = currentUser?.role === UserRole.CLIENT;

  // ... (Edit state logic same as before) ...
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

  // ... (Handlers same as before) ...
  const handleAddItemToJob = () => { const type = jobTypes.find(t => t.id === newItemTypeId); if (!type) return; const newItem: JobItem = { id: Math.random().toString(), jobTypeId: type.id, name: type.name, quantity: newItemQty, price: type.basePrice, selectedVariationIds: [] }; setEditItems([...editItems, newItem]); };
  const handleRemoveItemFromJob = (itemId: string) => { setEditItems(editItems.filter(i => i.id !== itemId)); };
  const handleSaveChanges = () => { const newTotal = editItems.reduce((acc, i) => acc + (i.price * i.quantity), 0); const dateParts = editDueDate.split('-'); const adjustedDate = new Date(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2])); updateJob(job.id, { dueDate: adjustedDate, urgency: editUrgency, notes: editNotes, items: editItems, totalValue: newTotal, history: [...job.history, { id: Math.random().toString(), timestamp: new Date(), action: 'Ficha Editada Manualmente (Itens/Datas)', userId: currentUser?.id || 'admin', userName: currentUser?.name || 'Admin' }] }); setShowEditModal(false); };
  const getStatusColor = (status: JobStatus) => { switch(status) { case JobStatus.COMPLETED: return 'bg-green-100 text-green-700 border-green-200'; case JobStatus.IN_PROGRESS: return 'bg-blue-100 text-blue-700 border-blue-200'; case JobStatus.WAITING_APPROVAL: return 'bg-purple-100 text-purple-700 border-purple-200'; default: return 'bg-slate-100 text-slate-700 border-slate-200'; } };
  const getTimelineIcon = (action: string) => { const lower = action.toLowerCase(); if (lower.includes('entrada')) return <LogIn size={16} className="text-blue-600" />; if (lower.includes('saída')) return <LogOut size={16} className="text-orange-600" />; if (lower.includes('concluído') || lower.includes('finalizado')) return <CheckCircle size={16} className="text-green-600" />; if (lower.includes('criado') || lower.includes('cadastro')) return <Flag size={16} className="text-purple-600" />; if (lower.includes('aprovado')) return <CheckSquare size={16} className="text-teal-600" />; return <Clock size={16} className="text-slate-500" />; };
  const sortedHistory = [...job.history].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  const hasStl = job.attachments?.some(a => a.name.toLowerCase().endsWith('.stl'));

  const copyPix = () => {
      if (activeOrganization?.financialSettings?.pixKey) {
          navigator.clipboard.writeText(activeOrganization.financialSettings.pixKey);
          setCopiedPix(true);
          setTimeout(() => setCopiedPix(false), 2000);
      }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* 3D Viewer */}
      {show3DViewer && job.attachments && (<Suspense fallback={<div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center text-white"><Loader2 className="animate-spin mr-2"/> Carregando Visualizador 3D...</div>}><STLViewer files={job.attachments} onClose={() => setShow3DViewer(false)} /></Suspense>)}
      {/* Alert Modal */}
      {showAlertModal && <CreateAlertModal job={job} onClose={() => setShowAlertModal(false)} />}
      {/* Edit Modal */}
      {showEditModal && (<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"><div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-in zoom-in duration-200"><div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4"><h3 className="text-xl font-bold text-slate-800 flex items-center gap-2"><Edit size={24} className="text-blue-600" /> Editar Ficha do Trabalho</h3><button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-slate-600"><X size={24} /></button></div><div className="space-y-6"><div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div><label className="block text-sm font-bold text-slate-700 mb-1">Data Prevista de Entrega</label><input type="date" value={editDueDate} onChange={e => setEditDueDate(e.target.value)} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" /></div><div><label className="block text-sm font-bold text-slate-700 mb-1">Nível de Urgência</label><select value={editUrgency} onChange={e => setEditUrgency(e.target.value as UrgencyLevel)} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"><option value={UrgencyLevel.LOW}>Baixa</option><option value={UrgencyLevel.NORMAL}>Normal</option><option value={UrgencyLevel.HIGH}>Alta</option><option value={UrgencyLevel.VIP}>VIP (Prometido)</option></select></div></div><div className="bg-slate-50 p-4 rounded-xl border border-slate-200"><h4 className="font-bold text-slate-700 mb-3 flex items-center gap-2"><Layers size={18} /> Itens e Serviços</h4><div className="space-y-2 mb-4">{editItems.map((item, idx) => (<div key={idx} className="flex justify-between items-center bg-white p-3 rounded border border-slate-200"><span className="text-sm font-medium"><span className="font-bold text-blue-600 mr-2">{item.quantity}x</span> {item.name}</span><button onClick={() => handleRemoveItemFromJob(item.id)} className="text-red-400 hover:text-red-600"><Trash2 size={16} /></button></div>))}</div><div className="flex gap-2 items-end border-t border-slate-200 pt-3"><div className="flex-1"><label className="text-xs font-bold text-slate-500 mb-1 block">Adicionar Serviço</label><select value={newItemTypeId} onChange={e => setNewItemTypeId(e.target.value)} className="w-full px-2 py-2 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-blue-500">{jobTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></div><div className="w-20"><label className="text-xs font-bold text-slate-500 mb-1 block">Qtd</label><input type="number" min="1" value={newItemQty} onChange={e => setNewItemQty(parseInt(e.target.value))} className="w-full px-2 py-2 text-sm border border-slate-300 rounded" /></div><button onClick={handleAddItemToJob} className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"><Plus size={20} /></button></div></div><div><label className="block text-sm font-bold text-slate-700 mb-1">Observações</label><textarea value={editNotes} onChange={e => setEditNotes(e.target.value)} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" rows={3} /></div><div className="flex gap-3 pt-4"><button onClick={() => setShowEditModal(false)} className="flex-1 py-3 text-slate-600 font-bold hover:bg-slate-100 rounded-xl">Cancelar</button><button onClick={handleSaveChanges} className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-lg">Salvar Alterações</button></div></div></div></div>)}

      {/* Payment Modal */}
      {showPaymentModal && activeOrganization?.financialSettings && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
             <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md animate-in zoom-in duration-200">
                 <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
                      <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                          <DollarSign size={24} className="text-green-600" /> Realizar Pagamento
                      </h3>
                      <button onClick={() => setShowPaymentModal(false)} className="text-slate-400 hover:text-slate-600"><X size={24} /></button>
                  </div>
                  
                  <div className="space-y-6">
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-center">
                          <p className="text-slate-500 text-sm uppercase font-bold">Valor Total</p>
                          <p className="text-3xl font-bold text-slate-900">R$ {job.totalValue.toFixed(2)}</p>
                      </div>

                      {activeOrganization.financialSettings.pixKey && (
                          <div className="space-y-2">
                              <label className="block text-sm font-bold text-slate-700">Pagamento via PIX</label>
                              <div className="flex items-center gap-2 bg-slate-100 p-3 rounded-lg border border-slate-200">
                                  <div className="flex-1 font-mono text-sm break-all">{activeOrganization.financialSettings.pixKey}</div>
                                  <button onClick={copyPix} className="p-2 bg-white text-blue-600 rounded shadow-sm hover:bg-blue-50" title="Copiar">
                                      {copiedPix ? <Check size={16} /> : <Copy size={16} />}
                                  </button>
                              </div>
                          </div>
                      )}

                      {activeOrganization.financialSettings.paymentLink && (
                          <a 
                             href={activeOrganization.financialSettings.paymentLink} 
                             target="_blank" 
                             rel="noopener noreferrer"
                             className="block w-full py-4 bg-blue-600 text-white font-bold rounded-xl text-center hover:bg-blue-700 shadow-lg transition-all flex items-center justify-center gap-2"
                          >
                              <CreditCard size={20} /> Pagar com Cartão (Link Externo) <ExternalLink size={16} />
                          </a>
                      )}

                      {activeOrganization.financialSettings.bankInfo && (
                          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-sm text-slate-600">
                              <p className="font-bold mb-1">Dados Bancários:</p>
                              <p className="whitespace-pre-wrap">{activeOrganization.financialSettings.bankInfo}</p>
                          </div>
                      )}

                      {activeOrganization.financialSettings.instructions && (
                           <p className="text-xs text-slate-500 italic text-center">{activeOrganization.financialSettings.instructions}</p>
                      )}
                  </div>
             </div>
         </div>
      )}

      {/* Header */}
      <button onClick={() => navigate('/jobs')} className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors"><ArrowLeft size={20} /> Voltar para Lista</button>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 md:p-8 relative overflow-hidden">
         <div className={`absolute top-0 left-0 w-2 h-full ${job.urgency === UrgencyLevel.VIP ? 'bg-orange-500' : 'bg-blue-600'}`} />
         <div className="flex flex-col md:flex-row justify-between items-start gap-6">
            <div className="w-full">
                <div className="flex flex-wrap items-center gap-3 mb-2">
                    <span className="font-mono font-bold text-3xl text-slate-900 tracking-tight">OS #{job.osNumber || '---'}</span>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusColor(job.status)}`}>{job.status}</span>
                    {job.urgency === UrgencyLevel.VIP && <span className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-orange-100 text-orange-700 border border-orange-200"><AlertTriangle size={12} /> VIP / URGENTE</span>}
                </div>
                <h1 className="text-2xl font-bold text-slate-800">{job.patientName}</h1>
                <div className="flex items-center gap-2 text-slate-500 mt-1"><User size={16} /> Dr(a). {job.dentistName}</div>
            </div>
            <div className="flex flex-col md:items-end gap-3 w-full md:w-auto mt-4 md:mt-0">
                <div className="md:text-right flex items-center md:flex-col gap-2 md:gap-0">
                    <p className="text-xs text-slate-400 uppercase font-bold">Data de Entrega:</p>
                    <div className="flex items-center justify-end gap-2 text-lg font-bold text-slate-800"><Calendar size={18} className="text-blue-600" /> {new Date(job.dueDate).toLocaleDateString()}</div>
                </div>
                <div className="flex flex-wrap gap-2 w-full md:w-auto justify-end">
                    {isClient && (
                        <button 
                            onClick={() => setShowPaymentModal(true)}
                            className="px-4 py-2 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 shadow-lg shadow-green-200 flex items-center gap-2 text-sm transition-all"
                        >
                            <DollarSign size={16} /> Pagar Agora
                        </button>
                    )}
                    {canManage && (
                        <>
                            <button onClick={() => setShowAlertModal(true)} className="px-4 py-2 bg-red-50 border border-red-200 text-red-700 rounded-lg hover:bg-red-100 font-bold flex items-center gap-2 text-sm transition-colors"><Bell size={16} /> Alerta</button>
                            <button onClick={() => setShowEditModal(true)} className="px-4 py-2 bg-blue-50 border border-blue-200 text-blue-700 rounded-lg hover:bg-blue-100 font-bold flex items-center gap-2 text-sm transition-colors"><Edit size={16} /> Editar</button>
                        </>
                    )}
                    <div className="flex gap-2">
                        <button onClick={() => triggerPrint(job, 'SHEET')} className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 font-medium flex items-center gap-2 text-sm"><Printer size={16} /> Ficha</button>
                        <button onClick={() => triggerPrint(job, 'LABEL')} className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 font-medium flex items-center gap-2 text-sm"><Printer size={16} /> Etiqueta</button>
                    </div>
                </div>
            </div>
         </div>
      </div>

      <div className="flex border-b border-slate-200">
         <button onClick={() => setActiveTab('SUMMARY')} className={`px-6 py-3 font-bold text-sm flex items-center gap-2 transition-all ${activeTab === 'SUMMARY' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-500 hover:text-slate-800'}`}><FileText size={18} /> Resumo do Pedido</button>
         <button onClick={() => setActiveTab('PRODUCTION')} className={`px-6 py-3 font-bold text-sm flex items-center gap-2 transition-all ${activeTab === 'PRODUCTION' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-500 hover:text-slate-800'}`}><ListChecks size={18} /> Produção & Rastreio</button>
      </div>

      {activeTab === 'SUMMARY' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-left-2 duration-300">
            <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4"><div className="p-3 bg-blue-50 text-blue-600 rounded-xl"><Box size={24} /></div><div><p className="text-xs text-slate-400 uppercase font-bold">Caixa Física</p><div className="flex items-center gap-2"><span className="font-bold text-xl text-slate-800">{job.boxNumber || '-'}</span>{job.boxColor && <div className="w-4 h-4 rounded-full shadow-sm border border-black/10" style={{ backgroundColor: job.boxColor.hex }} title={job.boxColor.name} />}</div></div></div>
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4"><div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl"><MapPin size={24} /></div><div><p className="text-xs text-slate-400 uppercase font-bold">Local Atual</p><p className="font-bold text-lg text-slate-800">{job.currentSector || 'Recepção'}</p></div></div>
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4"><div className="p-3 bg-green-50 text-green-600 rounded-xl"><DollarSign size={24} /></div><div><p className="text-xs text-slate-400 uppercase font-bold">Valor Total</p><p className="font-bold text-lg text-slate-800">R$ {job.totalValue.toFixed(2)}</p></div></div>
            </div>
            {job.attachments && job.attachments.length > 0 && (<div className="lg:col-span-3 bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden p-6"><div className="flex justify-between items-center mb-4"><h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><FileText size={20} className="text-blue-500" /> Arquivos do Caso</h3>{hasStl && (<button onClick={() => setShow3DViewer(true)} className="px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-lg hover:bg-indigo-700 shadow-md flex items-center gap-2"><Box size={16} /> Abrir Viewer 3D</button>)}</div><div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">{job.attachments.map((file, idx) => (<a key={idx} href={file.url} target="_blank" rel="noopener noreferrer" className="flex items-center p-3 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors group"><div className="p-2 bg-blue-50 text-blue-600 rounded-lg mr-3 group-hover:bg-blue-100"><File size={20} /></div><div className="flex-1 min-w-0"><p className="font-bold text-sm text-slate-700 truncate">{file.name}</p><p className="text-xs text-slate-400">{new Date(file.uploadedAt).toLocaleDateString()}</p></div><Download size={16} className="text-slate-400 group-hover:text-blue-600" /></a>))}</div></div>)}
            <div className="lg:col-span-3 bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden"><div className="p-6 border-b border-slate-100"><h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Layers size={20} className="text-slate-400" /> Itens do Pedido</h3></div><div className="divide-y divide-slate-100">{job.items.map((item, idx) => (<div key={idx} className="p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center hover:bg-slate-50 gap-2"><div><div className="font-bold text-slate-800 text-lg"><span className="text-blue-600 mr-2">{item.quantity}x</span> {item.name}</div><div className="flex flex-col sm:flex-row sm:items-center gap-2 mt-1">{item.selectedVariationIds && item.selectedVariationIds.length > 0 && <p className="text-sm text-slate-500">Obs: Contém variações/adicionais</p>}{item.variationValues && Object.keys(item.variationValues).length > 0 && (<p className="text-sm text-blue-600 font-medium">{Object.values(item.variationValues).join(', ')}</p>)}{item.commissionDisabled && <span className="text-[10px] bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full font-bold border border-gray-300 w-fit">Sem Comissão</span>}</div></div><div className="text-left sm:text-right w-full sm:w-auto flex justify-between sm:block"><p className="font-bold text-slate-700">R$ {(item.price * item.quantity).toFixed(2)}</p><p className="text-xs text-slate-400">Unit: R$ {item.price.toFixed(2)}</p></div></div>))}</div>{job.notes && (<div className="p-6 bg-yellow-50 border-t border-yellow-100"><p className="text-xs font-bold text-yellow-700 uppercase mb-2">Observações</p><p className="text-yellow-900 text-sm italic">"{job.notes}"</p></div>)}</div>
        </div>
      )}

      {activeTab === 'PRODUCTION' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 animate-in fade-in slide-in-from-right-2 duration-300">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center"><h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Clock size={20} className="text-slate-500" /> Linha do Tempo</h3></div>
            <div className="p-6 md:p-8"><div className="relative"><div className="absolute left-4 top-4 bottom-4 w-0.5 bg-slate-200 md:left-1/2 md:-ml-0.5"></div><div className="space-y-8">{sortedHistory.map((event, index) => { const isLeft = index % 2 === 0; return (<div key={event.id} className={`relative flex flex-col md:flex-row gap-8 ${isLeft ? 'md:flex-row-reverse' : ''}`}><div className="hidden md:block flex-1"></div><div className="absolute left-0 md:left-1/2 md:-ml-4 flex items-center justify-center w-8 h-8 rounded-full bg-white border-4 border-slate-100 shadow-sm z-10"><div className="w-2 h-2 bg-blue-600 rounded-full"></div></div><div className="flex-1 ml-10 md:ml-0"><div className={`bg-white p-5 rounded-2xl border border-slate-100 shadow-sm relative hover:shadow-md transition-shadow group ${isLeft ? 'md:text-right' : 'md:text-left'}`}><div className={`hidden md:block absolute top-4 w-3 h-3 bg-white border-b border-r border-slate-100 transform rotate-45 ${isLeft ? '-left-1.5 border-l border-t-0' : '-right-1.5 border-r border-b-0'}`}></div><div className={`flex items-center gap-2 mb-2 ${isLeft ? 'md:flex-row-reverse' : ''}`}><div className="p-1.5 rounded-lg bg-slate-50 text-slate-600 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">{getTimelineIcon(event.action)}</div><span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{new Date(event.timestamp).toLocaleDateString()} • {new Date(event.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span></div><h4 className="font-bold text-slate-800 text-lg mb-1">{event.action}</h4><div className={`flex flex-col gap-1 ${isLeft ? 'md:items-end' : 'md:items-start'}`}>{event.sector && <span className="inline-block px-2 py-0.5 bg-slate-100 text-slate-600 text-xs font-bold rounded">Setor: {event.sector}</span>}<div className={`flex items-center gap-2 text-sm text-slate-500 mt-1 ${isLeft ? 'md:flex-row-reverse' : ''}`}><div className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-500">{event.userName.charAt(0)}</div><span>{event.userName}</span></div></div></div></div></div>)})}</div></div></div>
        </div>
      )}
    </div>
  );
};