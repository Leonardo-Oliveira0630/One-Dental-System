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

  // --- PLAN CHECK ---
  if (currentPlan && !currentPlan.features.hasStoreModule) {
      return (
          <FeatureLocked 
              title="Módulo de Loja Web Indisponível" 
              message="Seu plano atual não permite receber pedidos online diretamente dos dentistas. Faça um upgrade para habilitar a Loja Virtual." 
          />
      );
  }

  // Redirect if not manager/admin
  if (currentUser?.role !== UserRole.MANAGER && currentUser?.role !== UserRole.ADMIN) {
      return <div className="p-8 text-center text-slate-500">Acesso Negado</div>;
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
        // CALL BACKEND TO CAPTURE PAYMENT AND UPDATE JOB
        await api.apiManageOrderDecision(currentOrg.id, selectedJob.id, 'APPROVE');
        
        // Update local specific fields that the general backend function might not know (OS/Box)
        // We do this AFTER ensuring payment capture was successful via the function above
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
      if (reason === null) return; // Cancelled

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

  // --- BATCH DOWNLOAD LOGIC ---
  const handleDownloadAll = async (job: Job) => {
      if (!job.attachments || job.attachments.length === 0) return;
      
      setZippingJobId(job.id);
      
      try {
          const zip = new JSZip();
          const folderName = `${job.patientName.replace(/\s+/g, '_')}_Arquivos`;
          const folder = zip.folder(folderName);

          // Fetch all files
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

          // Generate Zip
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
            <h1 className="text-2xl font-bold text-slate-900">Pedidos Web Recebidos</h1>
            <p className="text-slate-500">Gerencie a entrada de trabalhos vindos da Loja Virtual.</p>
          </div>
          <div className="bg-purple-100 text-purple-700 px-4 py-2 rounded-xl font-bold text-sm">
              {incoming.length} Pendentes
          </div>
       </div>

       <div className="grid gap-4">
          {incoming.length === 0 ? (
            <div className="bg-white p-16 text-center rounded-2xl border border-dashed border-slate-300 flex flex-col items-center">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mb-4">
                    <Check size={32} />
                </div>
                <h3 className="text-lg font-bold text-slate-700">Tudo limpo!</h3>
                <p className="text-slate-400">Nenhum pedido aguardando aprovação no momento.</p>
            </div>
          ) : (
            incoming.map(job => (
                <div key={job.id} className="bg-white p-0 rounded-2xl shadow-sm border border-purple-100 overflow-hidden flex flex-col md:flex-row">
                    {/* Left Stripe */}
                    <div className="w-full md:w-2 bg-purple-500"></div>
                    
                    <div className="p-6 flex-1 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                        <div className="flex-1 space-y-4">
                            <div>
                                <div className="flex items-center gap-3 mb-2">
                                    <span className="px-3 py-1 bg-purple-100 text-purple-700 text-xs font-bold rounded-full flex items-center gap-1">
                                        <Clock size={12} /> Aguardando
                                    </span>
                                    {job.paymentStatus && (
                                        <span className={`px-3 py-1 text-xs font-bold rounded-full flex items-center gap-1 border ${job.paymentStatus === 'AUTHORIZED' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-yellow-50 text-yellow-700 border-yellow-200'}`}>
                                            <CreditCard size={12} /> {job.paymentStatus === 'AUTHORIZED' ? 'Pré-Autorizado' : 'Aguardando Pagamento'}
                                        </span>
                                    )}
                                    <span className="text-slate-400 text-sm">Pedido realizado em {new Date(job.createdAt).toLocaleDateString()}</span>
                                </div>
                                
                                <h3 className="text-xl font-bold text-slate-900 mb-1">{job.patientName}</h3>
                                
                                <div className="flex items-center gap-2 text-slate-600 text-sm">
                                    <User size={16} className="text-purple-500" />
                                    <span className="font-medium">Dr(a). {job.dentistName}</span>
                                </div>
                            </div>
                            
                            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                                <p className="text-xs font-bold text-slate-400 uppercase mb-1">Itens do Pedido</p>
                                <ul className="text-sm text-slate-700 space-y-1">
                                    {job.items.map((i, idx) => (
                                        <li key={idx} className="flex justify-between">
                                            <span>• {i.quantity}x {i.name}</span>
                                            <span className="font-bold">R$ {i.price.toFixed(2)}</span>
                                        </li>
                                    ))}
                                </ul>
                                {job.notes && (
                                    <div className="mt-3 pt-2 border-t border-slate-200">
                                        <p className="text-xs italic text-slate-500">"{job.notes}"</p>
                                    </div>
                                )}
                            </div>

                            {/* Attachments Section */}
                            {job.attachments && job.attachments.length > 0 && (
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <p className="text-xs font-bold text-slate-400 uppercase">Arquivos Anexados ({job.attachments.length})</p>
                                        <div className="flex gap-2">
                                            {hasStl(job) && (
                                                <button 
                                                    onClick={() => setViewing3DJob(job)}
                                                    className="flex items-center gap-1 px-2 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-bold hover:bg-indigo-100 transition-colors"
                                                >
                                                    <Box size={12} /> Ver 3D
                                                </button>
                                            )}
                                            <button 
                                                onClick={() => handleDownloadAll(job)}
                                                disabled={zippingJobId === job.id}
                                                className="flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs font-bold hover:bg-blue-100 transition-colors disabled:opacity-50"
                                            >
                                                {zippingJobId === job.id ? <Loader2 size={12} className="animate-spin"/> : <Archive size={12} />} 
                                                Baixar Todos (ZIP)
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
                                                download={file.name} // Hint to browser
                                                className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-xs font-medium hover:bg-slate-50 hover:border-blue-300 hover:text-blue-600 transition-all"
                                                title="Clique para baixar"
                                            >
                                                <File size={14} /> 
                                                <span className="max-w-[150px] truncate">{file.name}</span>
                                                <Download size={12} className="opacity-50" />
                                            </a>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                        
                        <div className="flex flex-col gap-3 w-full md:w-auto border-t md:border-t-0 md:border-l border-slate-100 pt-4 md:pt-0 md:pl-6">
                             <div className="text-right mb-2 hidden md:block">
                                <span className="text-xs text-slate-400 uppercase font-bold">Valor Total</span>
                                <p className="text-2xl font-bold text-slate-800">R$ {job.totalValue.toFixed(2)}</p>
                             </div>

                            <button 
                                onClick={() => handleOpenApprove(job)}
                                className="px-6 py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 shadow-lg shadow-green-200 flex items-center justify-center gap-2 transition-all transform hover:scale-105"
                            >
                                <Check size={20} /> Aprovar & Capturar
                            </button>
                            
                            <button 
                                onClick={() => handleReject(job)}
                                className="px-6 py-3 bg-white border-2 border-red-100 text-red-600 font-bold rounded-xl hover:bg-red-50 hover:border-red-200 flex items-center justify-center gap-2 transition-colors"
                            >
                                <X size={20} /> Rejeitar & Estornar
                            </button>
                        </div>
                    </div>
                </div>
            ))
          )}
       </div>

       {/* Approval Modal */}
       {selectedJob && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white p-8 rounded-3xl w-full max-w-lg shadow-2xl animate-in zoom-in duration-200">
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900">Oficializar Entrada</h2>
                        <p className="text-slate-500 text-sm">Ao confirmar, o valor do pedido será cobrado do dentista.</p>
                    </div>
                    <div className="bg-purple-100 text-purple-700 px-3 py-1 rounded-lg text-xs font-bold">
                        WEB
                    </div>
                </div>
                
                <div className="space-y-5">
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                        <p className="text-xs font-bold text-slate-400 uppercase mb-1">Paciente</p>
                        <p className="font-bold text-lg text-slate-800">{selectedJob.patientName}</p>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Número OS (Gerado)</label>
                        <div className="relative">
                            <input 
                                value={osInput}
                                onChange={e => setOsInput(e.target.value)}
                                className="w-full pl-4 pr-4 py-3 border border-slate-300 rounded-xl font-mono text-xl font-bold tracking-widest text-center focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>
                        <p className="text-xs text-slate-400 mt-1 text-center">Você pode alterar este número manualmente se necessário.</p>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Nº Caixa</label>
                            <input 
                                value={boxNum}
                                onChange={e => setBoxNum(e.target.value)}
                                className="w-full px-4 py-3 border border-slate-300 rounded-xl text-center font-bold"
                                placeholder="--"
                            />
                        </div>
                         <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Cor</label>
                            <div className="flex gap-2 items-center h-[50px]">
                                {BOX_COLORS.slice(0, 5).map(color => (
                                    <button
                                        key={color.id}
                                        onClick={() => setBoxColorId(color.id)}
                                        className={`w-8 h-8 rounded-full border-2 transition-all ${
                                            boxColorId === color.id ? 'border-slate-800 scale-125 shadow-md' : 'border-transparent opacity-50 hover:opacity-100'
                                        }`}
                                        style={{ backgroundColor: color.hex }}
                                        title={color.name}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-slate-100">
                    <button 
                        onClick={() => setSelectedJob(null)} 
                        disabled={isProcessing}
                        className="px-6 py-3 text-slate-500 hover:bg-slate-50 rounded-xl font-bold transition-colors"
                    >
                        Cancelar
                    </button>
                    <button 
                        onClick={confirmApproval} 
                        disabled={isProcessing}
                        className="px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-xl hover:shadow-lg shadow-blue-200 flex items-center gap-2 disabled:opacity-70"
                    >
                        {isProcessing ? <Loader2 className="animate-spin" /> : <><Check size={20} /> Confirmar & Cobrar</>}
                    </button>
                </div>
            </div>
         </div>
       )}
    </div>
  );
};