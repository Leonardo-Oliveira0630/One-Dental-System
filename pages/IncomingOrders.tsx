import logger from "../utils/logger";

import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Job, JobStatus, UserRole, Attachment } from '../types';
import { BOX_COLORS } from '../services/mockData';
import { Check, X, AlertOctagon, User, Clock, ArrowRight, Download, File, Box, Archive, Loader2, CreditCard, RefreshCw, Zap, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { STLViewer } from '../components/STLViewer';
import { AttachmentPreviewModal } from '../components/AttachmentPreviewModal';
import { FeatureLocked } from '../components/FeatureLocked';
import JSZip from 'jszip';
import FileSaver from 'file-saver';
import * as api from '../services/firebaseService'; // Import API functions

export const IncomingOrders = () => {
  const { jobs, updateJob, currentUser, currentPlan, currentOrg } = useApp();
  const navigate = useNavigate();

  const isSuperAdmin = currentUser?.role === UserRole.SUPER_ADMIN;
  const isFreeLab = currentOrg?.orgType === 'LAB' && (currentPlan?.id === 'free_lab' || currentPlan?.features?.isLabFreeStoreOnly === true);

  // --- PLAN CHECK (With SuperAdmin Bypass via FeatureLocked children) ---
  if (currentPlan && !currentPlan.features.hasStoreModule && !isSuperAdmin) {
      return (
          <FeatureLocked 
              title="Módulo de Loja Web Indisponível" 
              message="Seu plano atual não permite receber pedidos online diretamente dos dentistas. Faça um upgrade para habilitar a Loja Virtual." 
          />
      );
  }

  // Redirect if not manager/admin/super
  if (currentUser?.role !== UserRole.MANAGER && currentUser?.role !== UserRole.ADMIN && !isSuperAdmin) {
      return <div className="p-8 text-center text-slate-500 font-bold uppercase tracking-widest">Acesso Negado</div>;
  }

  const incoming = jobs.filter(j => 
    j.status === JobStatus.WAITING_APPROVAL && 
    !j.isComboPurchase && 
    !(j.items && j.items.some((item: any) => item.isVoucherCombo === true))
  );

  // Approval Modal State
  const [isProcessing, setIsProcessing] = useState(false);

  // State for rejection justification modal
  const [rejectingOrderJob, setRejectingOrderJob] = useState<Job | null>(null);
  const [orderRejectionReason, setOrderRejectionReason] = useState('');
  
  // 3D Viewer & Attachment Preview State
  const [selectedAttachment, setSelectedAttachment] = useState<Attachment | null>(null);
  const [allAttachmentsForPreview, setAllAttachmentsForPreview] = useState<Attachment[]>([]);
  
  // Downloading State
  const [zippingJobId, setZippingJobId] = useState<string | null>(null);
  const [syncingJobId, setSyncingJobId] = useState<string | null>(null);

  const handleSyncSingleJob = async (jobId: string, force: boolean = false) => {
    if (force) {
      const confirmForce = window.confirm("Deseja forçar a marcação deste pedido como PAGO e gerar os respectivos vouchers? Use isso se o cliente pagou por fora.");
      if (!confirmForce) return;
    }
    setSyncingJobId(jobId);
    try {
      const res = await api.apiSyncStoreOrders({ organizationId: currentOrg?.id, jobId, forceMarkPaid: force });
      alert(`Sincronização concluída! Status de pagamento: ${res.paymentsUpdated ? 'Atualizado para Pago' : 'Inalterado/Já Pago'}. Vouchers de combos gerados: ${res.vouchersGenerated || 0}.`);
    } catch (err: any) {
      logger.error({ userId: currentUser?.id }, "Erro ao sincronizar pedido:", err);
      alert("Erro ao sincronizar pedido: " + (err.message || err));
    } finally {
      setSyncingJobId(null);
    }
  };

  const handleOpenApprove = (job: Job) => {
    navigate('/new-job', {
      state: {
        patientName: job.patientName,
        dentistId: job.dentistId,
        dentistName: job.dentistName,
        items: job.items,
        products: job.products || [],
        notes: job.notes || '',
        origin: 'ONLINE_ORDER',
        onlineOrderId: job.id,
        attachments: job.attachments || [],
        paymentStatus: job.paymentStatus || 'PENDING'
      }
    });
  };

  const handleReject = (job: Job) => {
      setRejectingOrderJob(job);
      setOrderRejectionReason('');
  };

  const confirmOrderRejection = async () => {
      if (!rejectingOrderJob || !currentOrg) return;
      if (!orderRejectionReason.trim()) {
          alert("Por favor, preencha o motivo da recusa.");
          return;
      }
      setIsProcessing(true);
      try {
          await api.apiManageOrderDecision(currentOrg.id, rejectingOrderJob.id, 'REJECT', orderRejectionReason.trim());
          await updateJob(rejectingOrderJob.id, {
              rejectedAt: new Date()
          });
          alert("Pedido rejeitado e estorno realizado.");
          setRejectingOrderJob(null);
          setOrderRejectionReason('');
      } catch (error: any) {
          logger.error({ userId: currentUser?.id }, "Erro ao rejeitar:", error);
          alert("Erro ao realizar estorno: " + error.message);
      } finally {
          setIsProcessing(false);
      }
  };

  const hasStl = (job: Job) => job.attachments?.some(a => a.name.toLowerCase().endsWith('.stl'));

  const handleDownloadAll = async (job: Job) => {
      if (!job.attachments || job.attachments.length === 0) return;
      
      setZippingJobId(job.id);
      
      try {
          const zip = new JSZip();
          const folderName = `${job.patientName.replace(/\s+/g, '_')}_Arquivos`;
          const folder = zip.folder(folderName);

          const downloadPromises = job.attachments.map(async (file) => {
              try {
                  const downloadUrl = await api.getOriginalUrl(file.url);
                  const response = await fetch(downloadUrl);
                  const blob = await response.blob();
                  folder?.file(file.name, blob);
              } catch (err) {
                  logger.error({ userId: currentUser?.id }, `Erro ao baixar arquivo ${file.name}:`, err);
              }
          });

          await Promise.all(downloadPromises);

          const content = await zip.generateAsync({ type: "blob" });
          FileSaver.saveAs(content, `${folderName}.zip`);

      } catch (error) {
          logger.error({ userId: currentUser?.id }, "Erro ao criar ZIP:", error);
          alert("Erro ao criar arquivo ZIP. Tente baixar os arquivos individualmente.");
      } finally {
          setZippingJobId(null);
      }
  };

  return (
    <div className="space-y-6">
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

       <div className="flex justify-between items-end">
          <div>
            <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Pedidos Web Recebidos</h1>
            <p className="text-slate-500 font-medium">Gerencie a entrada de trabalhos vindos da Loja Virtual.</p>
          </div>
          <div className="bg-purple-100 text-purple-700 px-4 py-2 rounded-xl font-bold text-sm">
              {incoming.length} Pendentes
          </div>
       </div>

       <div className="grid gap-4">
          {incoming.length === 0 ? (
            <div className="bg-white p-16 text-center rounded-3xl border border-dashed border-slate-300 flex flex-col items-center">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mb-4">
                    <Check size={32} />
                </div>
                <h3 className="text-lg font-bold text-slate-700">Tudo limpo!</h3>
                <p className="text-slate-400">Nenhum pedido aguardando aprovação no momento.</p>
            </div>
          ) : (
            incoming.map(job => (
                <div key={job.id} className="bg-white p-0 rounded-3xl shadow-sm border border-purple-100 overflow-hidden flex flex-col md:flex-row">
                    <div className="w-full md:w-2 bg-purple-500"></div>
                    
                    <div className="p-6 flex-1 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                        <div className="flex-1 space-y-4">
                            <div>
                                <div className="flex flex-wrap items-center gap-3 mb-2">
                                    <span className="px-3 py-1 bg-purple-100 text-purple-700 text-[10px] font-black uppercase rounded-full flex items-center gap-1 border border-purple-200">
                                        <Clock size={12} /> Aguardando
                                    </span>
                                    {job.paymentStatus && (
                                        <span className={`px-3 py-1 text-[10px] font-black uppercase rounded-full flex items-center gap-1 border ${
                                            job.paymentStatus === 'VOUCHER' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                                            job.paymentStatus === 'PAID' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                            job.paymentStatus === 'AUTHORIZED' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                            'bg-yellow-50 text-yellow-700 border-yellow-200'
                                        }`}>
                                            <CreditCard size={12} /> {
                                                job.paymentStatus === 'VOUCHER' ? 'Voucher' :
                                                job.paymentStatus === 'PAID' ? 'Pago' :
                                                job.paymentStatus === 'AUTHORIZED' ? 'Pré-Autorizado' :
                                                'Aguardando Pagamento'
                                            }
                                        </span>
                                    )}
                                    <span className="text-slate-400 text-xs font-bold uppercase tracking-widest">Pedido em {new Date(job.createdAt).toLocaleDateString()}</span>
                                </div>
                                
                                <h3 className="text-xl font-black text-slate-900 mb-1 uppercase tracking-tight">{job.patientName}</h3>
                                
                                <div className="flex items-center gap-2 text-slate-500 text-sm font-bold">
                                    <User size={16} className="text-purple-500" />
                                    <span className="uppercase">Dr(a). {job.dentistName}</span>
                                </div>
                            </div>
                            
                            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Itens do Pedido</p>
                                <ul className="text-sm text-slate-700 space-y-2">
                                    {job.items.map((i, idx) => (
                                        <li key={idx} className="flex justify-between border-b border-slate-100 last:border-0 pb-1">
                                            <span className="font-bold"><span className="text-purple-600 mr-1">{i.quantity}x</span> {i.name}</span>
                                            <span className="font-black">R$ {i.price.toFixed(2)}</span>
                                        </li>
                                    ))}
                                </ul>
                                {job.notes && (
                                    <div className="mt-3 pt-2 border-t border-slate-200">
                                        <p className="text-xs italic text-slate-500 font-medium">"{job.notes}"</p>
                                    </div>
                                )}
                            </div>

                            {job.attachments && job.attachments.length > 0 && (
                                <div>
                                    <div className="flex items-center justify-between mb-3">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Arquivos Digitais ({job.attachments.length})</p>
                                        <div className="flex gap-2">
                                            <button 
                                                onClick={() => handleDownloadAll(job)}
                                                disabled={zippingJobId === job.id}
                                                className="flex items-center gap-1 px-3 py-1.5 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase hover:bg-slate-800 transition-all shadow-md"
                                            >
                                                {zippingJobId === job.id ? <Loader2 size={14} className="animate-spin"/> : <Archive size={14} />} 
                                                Exportar Tudo
                                            </button>
                                        </div>
                                    </div>
                                    
                                    <div className="flex gap-2 flex-wrap items-center">
                                        {job.attachments.map((file, idx) => (
                                            <button 
                                                key={idx} 
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    setSelectedAttachment(file);
                                                    setAllAttachmentsForPreview(job.attachments || []);
                                                }}
                                                className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl text-[10px] font-black uppercase hover:bg-slate-50 hover:border-blue-300 hover:text-blue-600 transition-all shadow-sm"
                                            >
                                                <File size={14} /> 
                                                <span className="max-w-[120px] truncate">{file.name}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                        
                        <div className="flex flex-col gap-3 w-full md:w-auto border-t md:border-t-0 md:border-l border-slate-100 pt-4 md:pt-0 md:pl-8">
                             <div className="text-right mb-2 hidden md:block">
                                <span className="text-[10px] text-slate-400 uppercase font-black tracking-widest">Valor do Pedido</span>
                                <p className="text-3xl font-black text-slate-800">R$ {job.totalValue.toFixed(2)}</p>
                             </div>

                            <button 
                                onClick={() => handleOpenApprove(job)}
                                className="px-8 py-4 bg-green-600 text-white font-black rounded-2xl hover:bg-green-700 shadow-xl shadow-green-100 flex items-center justify-center gap-2 transition-all transform active:scale-95"
                            >
                                <Check size={20} /> APROVAR CASO
                            </button>
                            
                            <button 
                                onClick={() => handleReject(job)}
                                className="px-8 py-4 bg-white border-2 border-red-100 text-red-600 font-black rounded-2xl hover:bg-red-50 flex items-center justify-center gap-2 transition-all text-xs"
                            >
                                <X size={20} /> REJEITAR / ESTORNAR
                            </button>

                            {job.paymentStatus !== 'PAID' && job.paymentStatus !== 'VOUCHER' && (
                                <div className="flex flex-col gap-2 mt-2 pt-2 border-t border-slate-100">
                                    <button 
                                        onClick={() => handleSyncSingleJob(job.id, false)}
                                        disabled={syncingJobId === job.id}
                                        className="w-full py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all text-xs disabled:opacity-50"
                                    >
                                        <RefreshCw size={14} className={syncingJobId === job.id ? "animate-spin" : ""} /> Sincronizar Asaas
                                    </button>
                                    <button 
                                        onClick={() => handleSyncSingleJob(job.id, true)}
                                        disabled={syncingJobId === job.id}
                                        className="w-full py-2 bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all text-xs disabled:opacity-50"
                                    >
                                        <Zap size={14} /> Forçar Como Pago
                                    </button>
                                </div>
                            )}


                        </div>
                    </div>
                </div>
            ))
          )}
  </div>

      {/* Modal de Justificativa de Recusa para Pedidos */}
      {rejectingOrderJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-slate-100 animate-scale-up">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
                <X className="text-red-500" size={20} /> Recusar Pedido
              </h3>
              <button 
                onClick={() => setRejectingOrderJob(null)}
                className="text-slate-400 hover:text-slate-600 transition"
              >
                <X size={20} />
              </button>
            </div>
            
            <p className="text-xs text-slate-500 mb-4 font-medium leading-relaxed">
              Informe a justificativa de recusa para o pedido de <strong>{rejectingOrderJob.patientName}</strong> (Dentista: {rejectingOrderJob.dentistName}). O valor pago será estornado automaticamente ao dentista e ele poderá visualizar o motivo da recusa.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Justificativa / Motivo da Recusa *</label>
                <textarea
                  value={orderRejectionReason}
                  onChange={(e) => setOrderRejectionReason(e.target.value)}
                  placeholder="Ex: Escaneamento com distorção no dente 21, favor reenviar..."
                  rows={4}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-all resize-none"
                  required
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6 pt-4 border-t border-slate-100">
              <button
                onClick={() => setRejectingOrderJob(null)}
                className="flex-1 py-3 text-slate-500 hover:bg-slate-50 rounded-2xl text-xs font-black uppercase transition-all"
                disabled={isProcessing}
              >
                Cancelar
              </button>
              <button
                onClick={confirmOrderRejection}
                disabled={isProcessing}
                className="flex-[2] py-3 bg-red-600 hover:bg-red-700 text-white rounded-2xl text-xs font-black uppercase shadow-lg shadow-red-100 flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
              >
                {isProcessing ? <Loader2 className="animate-spin" size={16} /> : <><Check size={16} /> Confirmar Recusa</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
