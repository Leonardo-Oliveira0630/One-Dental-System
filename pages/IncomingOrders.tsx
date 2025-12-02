import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Job, JobStatus, UserRole } from '../types';
import { BOX_COLORS } from '../services/mockData';
import { Check, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const IncomingOrders = () => {
  const { jobs, updateJob, currentUser } = useApp();
  const navigate = useNavigate();

  // Redirect if not manager
  if (currentUser?.role !== UserRole.MANAGER && currentUser?.role !== UserRole.ADMIN) {
      return <div className="p-8">Acesso Negado</div>;
  }

  const incoming = jobs.filter(j => j.status === JobStatus.WAITING_APPROVAL);

  // Approval Modal State
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [osInput, setOsInput] = useState('');
  const [boxNum, setBoxNum] = useState('');
  const [boxColorId, setBoxColorId] = useState(BOX_COLORS[0].id);

  const handleOpenApprove = (job: Job) => {
    // Auto-generate a suggested OS number based on count
    setOsInput((1000 + jobs.length + 1).toString());
    setSelectedJob(job);
  };

  const confirmApproval = () => {
    if (!selectedJob) return;
    
    updateJob(selectedJob.id, {
        status: JobStatus.PENDING,
        osNumber: osInput,
        boxNumber: boxNum,
        boxColor: BOX_COLORS.find(c => c.id === boxColorId),
        history: [...selectedJob.history, {
            id: Math.random().toString(),
            timestamp: new Date(),
            action: 'Aprovado & OS Atribuída',
            userId: currentUser.id,
            userName: currentUser.name
        }]
    });
    setSelectedJob(null);
  };

  return (
    <div className="space-y-6">
       <div>
          <h1 className="text-2xl font-bold text-slate-900">Pedidos Web Recebidos</h1>
          <p className="text-slate-500">Revise e aprove os pedidos enviados pelos dentistas.</p>
       </div>

       <div className="grid gap-4">
          {incoming.length === 0 ? (
            <div className="bg-white p-12 text-center rounded-2xl border border-dashed border-slate-300">
                <p className="text-slate-400">Nenhum pedido pendente encontrado.</p>
            </div>
          ) : (
            incoming.map(job => (
                <div key={job.id} className="bg-white p-6 rounded-2xl shadow-sm border border-purple-100 flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                             <span className="px-3 py-1 bg-purple-100 text-purple-700 text-xs font-bold rounded-full">Pedido Web</span>
                             <span className="text-slate-400 text-sm">{new Date(job.createdAt).toLocaleDateString()}</span>
                        </div>
                        <h3 className="text-lg font-bold text-slate-900">{job.patientName}</h3>
                        <p className="text-slate-600 text-sm">Dr. {job.dentistName}</p>
                        <div className="mt-2 text-sm text-slate-500">
                            Itens: {job.items.map(i => i.name).join(', ')}
                        </div>
                    </div>
                    
                    <div className="flex gap-3">
                        <button className="px-4 py-2 text-slate-500 hover:bg-slate-50 rounded-lg">Detalhes</button>
                        <button 
                            onClick={() => handleOpenApprove(job)}
                            className="px-6 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 shadow-md shadow-blue-200 flex items-center gap-2"
                        >
                            <Check size={18} /> Aprovar
                        </button>
                    </div>
                </div>
            ))
          )}
       </div>

       {/* Approval Modal */}
       {selectedJob && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white p-8 rounded-2xl w-full max-w-lg shadow-2xl">
                <h2 className="text-xl font-bold text-slate-900 mb-6">Aprovar Pedido: {selectedJob.patientName}</h2>
                
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Atribuir Número OS (Código de Barras)</label>
                        <input 
                            value={osInput}
                            onChange={e => setOsInput(e.target.value)}
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg font-mono text-lg"
                        />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Número da Caixa</label>
                            <input 
                                value={boxNum}
                                onChange={e => setBoxNum(e.target.value)}
                                className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                                placeholder="Ex: 15"
                            />
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Cor da Caixa</label>
                            <div className="flex gap-2 mt-2">
                                {BOX_COLORS.map(color => (
                                    <button
                                        key={color.id}
                                        onClick={() => setBoxColorId(color.id)}
                                        className={`w-8 h-8 rounded-full border-2 transition-all ${
                                            boxColorId === color.id ? 'border-slate-800 scale-110' : 'border-transparent'
                                        }`}
                                        style={{ backgroundColor: color.hex }}
                                        title={color.name}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-3 mt-8">
                    <button onClick={() => setSelectedJob(null)} className="px-4 py-2 text-slate-500 hover:bg-slate-50 rounded-lg">Cancelar</button>
                    <button onClick={confirmApproval} className="px-6 py-2 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700">Confirmar & Imprimir</button>
                </div>
            </div>
         </div>
       )}
    </div>
  );
};