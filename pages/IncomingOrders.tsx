
import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Job, JobStatus, UserRole, Attachment } from '../types';
import { BOX_COLORS } from '../services/mockData';
import { Check, X, AlertOctagon, User, Clock, ArrowRight, Download, File, Box, Archive, Loader2, CreditCard } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { STLViewer } from '../components/STLViewer';
import { FeatureLocked } from '../components/FeatureLocked';
import JSZip from 'jszip';
import FileSaver from 'file-saver';
import * as api from '../services/firebaseService'; // Import API functions

export const IncomingOrders = () => {
  const { jobs, updateJob, currentUser, currentPlan, currentOrg } = useApp();
  const navigate = useNavigate();

  const isSuperAdmin = currentUser?.role === UserRole.SUPER_ADMIN;

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

  const incoming = jobs.filter(j => j.status === JobStatus.WAITING_APPROVAL);

  // Approval Modal State
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [osInput, setOsInput] = useState('');
  const [boxNum, setBoxNum] = useState('');
  const [boxColorId, setBoxColorId] = useState(BOX_COLORS[0].id);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // 3D Viewer State
  const [viewing3DJob, setViewing3DJob] = useState<Job | null>(null);
  
  // Downloading State
  const [zippingJobId, setZippingJobId] = useState<string | null>(null);

  const handleOpenApprove = (job: Job) => {
    let maxId = 0;
    jobs.forEach(j => {
      const num = parseInt(j.osNumber?.split('-')[0] || '0');
      if (!isNaN(num) && num > maxId) maxId = num;
    });
    const nextId = (maxId + 1).toString().padStart(4, '0');

    setOsInput(nextId);
    setSelectedJob(job);
  };

  const confirmApproval = async () => {
    if (!selectedJob || !currentOrg) return;
    setIsProcessing(true);
    
    try {
        await api.apiManageOrderDecision(currentOrg.id, selectedJob.id, 'APPROVE');
        
        await updateJob(selectedJob.id, {
            osNumber: osInput,
            boxNumber: boxNum,
            boxColor: BOX_COLORS.find(c => c.id === boxColorId),
            history: [...selectedJob.history, {
                id: Math.random().toString(),
                timestamp: new Date(),
                action: `OS ${osInput} Atribuída e Caixa ${boxNum} definida`,
                userId: currentUser.id,
                userName: currentUser.name,
                sector: 'Recepção'
            }]
        });

        alert("Pedido aprovado e pagamento capturado com sucesso!");
        setSelectedJob(null);
    } catch (error: any) {
        console.error("Erro ao aprovar:", error);
        alert("Erro ao aprovar pedido: " + (error.message || "Tente novamente"));
    } finally {
        setIsProcessing(false);
    }
  };

  const handleReject = async (job: Job) => {
      const reason = window.prompt(`Motivo da rejeição para ${job.patientName}? (O valor será estornado ao dentista)`);
      if (reason === null) return; 

      if (!currentOrg) return;
      
      try {
          await api.apiManageOrderDecision(currentOrg.id, job.id, 'REJECT', reason);
          alert("Pedido rejeitado e estorno realizado.");
      } catch (error: any) {
          console.error("Erro ao rejeitar:", error);
          alert("Erro ao realizar estorno: " + error.message);
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
                  const response = await fetch(file.url);
                  const blob = await response.blob();
                  folder?.file(file.name, blob);
              } catch (err) {
                  console.error(`Erro ao baixar arquivo ${file.name}:`, err);
              }
          });

          await Promise.all(downloadPromises);

          const content = await zip.generateAsync({ type: "blob" });
          FileSaver.saveAs(content, `${folderName}.zip`);

      } catch (error) {
          console.error("Erro ao criar ZIP:", error);
          alert("Erro ao criar arquivo ZIP. Tente baixar os arquivos individualmente.");
      } finally {
          setZippingJobId(null);
      }
  };

  return (
    <div className="space-y-6">
       {viewing3DJob && viewing3DJob.attachments && (
           <STLViewer 
                files={viewing3DJob.attachments} 
                onClose={() => setViewing3DJob(null)} 
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
                                        <span className={`px-3 py-1 text-[10px] font-black uppercase rounded-full flex items-center gap-1 border ${job.paymentStatus === 'AUTHORIZED' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-yellow-50 text-yellow-700 border-yellow-200'}`}>
                                            <CreditCard size={12} /> {job.paymentStatus === 'AUTHORIZED' ? 'Pré-Autorizado' : 'Aguardando Pagamento'}
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
                                            {hasStl(job) && (
                                                <button 
                                                    onClick={() => setViewing3DJob(job)}
                                                    className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase hover:bg-indigo-700 transition-all shadow-md shadow-indigo-100"
                                                >
                                                    <Box size={14} /> Abrir 3D
                                                </button>
                                            )}
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
                                            <a 
                                                key={idx} 
                                                href={file.url} 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl text-[10px] font-black uppercase hover:bg-slate-50 hover:border-blue-300 hover:text-blue-600 transition-all shadow-sm"
                                            >
                                                <File size={14} /> 
                                                <span className="max-w-[120px] truncate">{file.name}</span>
                                            </a>
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
                        </div>
                    </div>
                </div>
            ))
          )}
       </div>

       {/* Approval Modal */}
       {selectedJob && (
         <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white p-8 rounded-[40px] w-full max-w-lg shadow-2xl animate-in zoom-in duration-200 overflow-hidden">
                <div className="flex justify-between items-start mb-8">
                    <div>
                        <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Entrada Digital</h2>
                        <p className="text-slate-500 text-sm font-medium">Oficializar trabalho na produção interna.</p>
                    </div>
                    <div className="bg-purple-100 text-purple-700 px-3 py-1 rounded-xl text-[10px] font-black uppercase border border-purple-200">
                        WEB-ORDER
                    </div>
                </div>
                
                <div className="space-y-6">
                    <div className="bg-slate-50 p-5 rounded-3xl border border-slate-200">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Paciente</p>
                        <p className="font-black text-xl text-slate-800 uppercase tracking-tight">{selectedJob.patientName}</p>
                    </div>

                    <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Gerar Número da OS</label>
                        <input 
                            value={osInput}
                            onChange={e => setOsInput(e.target.value)}
                            className="w-full px-4 py-4 bg-slate-50 border border-slate-300 rounded-2xl font-mono text-2xl font-black tracking-[0.2em] text-center focus:ring-4 focus:ring-blue-100 outline-none text-blue-600 transition-all"
                        />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Caixa de Bancada</label>
                            <input 
                                value={boxNum}
                                onChange={e => setBoxNum(e.target.value)}
                                className="w-full px-4 py-4 bg-slate-50 border border-slate-300 rounded-2xl text-center font-black text-xl outline-none"
                                placeholder="--"
                            />
                        </div>
                         <div>
                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 ml-1">Cor do Lote</label>
                            <div className="flex flex-wrap gap-2 items-center justify-center">
                                {BOX_COLORS.slice(0, 5).map(color => (
                                    <button
                                        key={color.id}
                                        onClick={() => setBoxColorId(color.id)}
                                        className={`w-8 h-8 rounded-full border-4 transition-all ${
                                            boxColorId === color.id ? 'border-slate-800 scale-125 shadow-lg' : 'border-transparent opacity-40 hover:opacity-100'
                                        }`}
                                        style={{ backgroundColor: color.hex }}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex gap-3 mt-10 pt-6 border-t border-slate-100">
                    <button 
                        onClick={() => setSelectedJob(null)} 
                        disabled={isProcessing}
                        className="flex-1 py-4 text-slate-400 font-black uppercase text-xs hover:bg-slate-50 rounded-2xl transition-all"
                    >
                        Cancelar
                    </button>
                    <button 
                        onClick={confirmApproval} 
                        disabled={isProcessing}
                        className="flex-[2] py-4 bg-blue-600 text-white font-black rounded-2xl hover:bg-blue-700 shadow-xl shadow-blue-100 flex items-center justify-center gap-2 disabled:opacity-70 transition-all active:scale-95"
                    >
                        {isProcessing ? <Loader2 className="animate-spin" /> : <><Check size={20} /> CONFIRMAR ENTRADA</>}
                    </button>
                </div>
            </div>
         </div>
       )}
    </div>
  );
};
