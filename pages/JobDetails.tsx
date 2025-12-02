
import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { JobStatus, UrgencyLevel, UserRole } from '../types';
import { 
  ArrowLeft, Calendar, User, Clock, MapPin, 
  FileText, DollarSign, CheckCircle, AlertTriangle, 
  Printer, Box, Layers, ListChecks, Bell
} from 'lucide-react';
import { CreateAlertModal } from '../components/AlertSystem';

export const JobDetails = () => {
  const { id } = useParams();
  const { jobs, triggerPrint, currentUser } = useApp();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'SUMMARY' | 'PRODUCTION'>('SUMMARY');
  const [showAlertModal, setShowAlertModal] = useState(false);

  const job = jobs.find(j => j.id === id);

  // Permissão: Admin ou Gestor pode criar alertas
  const canCreateAlerts = currentUser?.role === UserRole.MANAGER || currentUser?.role === UserRole.ADMIN;

  if (!job) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh]">
        <h2 className="text-2xl font-bold text-slate-800">Trabalho não encontrado</h2>
        <button onClick={() => navigate('/jobs')} className="mt-4 text-blue-600 hover:underline">
          Voltar para lista
        </button>
      </div>
    );
  }

  // Helper for status colors
  const getStatusColor = (status: JobStatus) => {
    switch(status) {
        case JobStatus.COMPLETED: return 'bg-green-100 text-green-700 border-green-200';
        case JobStatus.IN_PROGRESS: return 'bg-blue-100 text-blue-700 border-blue-200';
        case JobStatus.WAITING_APPROVAL: return 'bg-purple-100 text-purple-700 border-purple-200';
        default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  // Sort history: Newest first for list
  const sortedHistory = [...job.history].sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Alert Creation Modal */}
      {showAlertModal && (
          <CreateAlertModal job={job} onClose={() => setShowAlertModal(false)} />
      )}

      {/* Header Navigation */}
      <button 
        onClick={() => navigate('/jobs')} 
        className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors"
      >
        <ArrowLeft size={20} /> Voltar para Lista
      </button>

      {/* Main Header Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 md:p-8 relative overflow-hidden">
         <div className={`absolute top-0 left-0 w-2 h-full ${job.urgency === UrgencyLevel.VIP ? 'bg-orange-500' : 'bg-blue-600'}`} />
         
         <div className="flex flex-col md:flex-row justify-between items-start gap-6">
            <div className="w-full">
                <div className="flex flex-wrap items-center gap-3 mb-2">
                    <span className="font-mono font-bold text-3xl text-slate-900 tracking-tight">
                        OS #{job.osNumber || '---'}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusColor(job.status)}`}>
                        {job.status}
                    </span>
                    {job.urgency === UrgencyLevel.VIP && (
                        <span className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-orange-100 text-orange-700 border border-orange-200">
                            <AlertTriangle size={12} /> VIP / URGENTE
                        </span>
                    )}
                </div>
                <h1 className="text-2xl font-bold text-slate-800">{job.patientName}</h1>
                <div className="flex items-center gap-2 text-slate-500 mt-1">
                    <User size={16} /> Dr(a). {job.dentistName}
                </div>
            </div>

            <div className="flex flex-col md:items-end gap-3 w-full md:w-auto mt-4 md:mt-0">
                <div className="md:text-right flex items-center md:flex-col gap-2 md:gap-0">
                    <p className="text-xs text-slate-400 uppercase font-bold">Data de Entrega:</p>
                    <div className="flex items-center justify-end gap-2 text-lg font-bold text-slate-800">
                        <Calendar size={18} className="text-blue-600" />
                        {new Date(job.dueDate).toLocaleDateString()}
                    </div>
                </div>
                
                <div className="flex flex-wrap gap-2 w-full md:w-auto justify-end">
                    {/* Create Alarm Button (Admin & Managers) */}
                    {canCreateAlerts && (
                        <button 
                            onClick={() => setShowAlertModal(true)}
                            title="Agendar um alerta de urgência para a equipe"
                            className="px-4 py-2 bg-red-50 border border-red-200 text-red-700 rounded-lg hover:bg-red-100 font-bold flex items-center gap-2 text-sm transition-colors"
                        >
                            <Bell size={16} /> Criar Alarme
                        </button>
                    )}

                    <div className="flex gap-2">
                        <button 
                            onClick={() => triggerPrint(job, 'SHEET')}
                            className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 font-medium flex items-center gap-2 text-sm"
                        >
                            <Printer size={16} /> Ficha
                        </button>
                        <button 
                             onClick={() => triggerPrint(job, 'LABEL')}
                            className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 font-medium flex items-center gap-2 text-sm"
                        >
                            <Printer size={16} /> Etiqueta
                        </button>
                    </div>
                </div>
            </div>
         </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
         <button
            onClick={() => setActiveTab('SUMMARY')}
            className={`px-6 py-3 font-bold text-sm flex items-center gap-2 transition-all ${
                activeTab === 'SUMMARY' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-500 hover:text-slate-800'
            }`}
         >
            <FileText size={18} /> Resumo do Pedido
         </button>
         <button
            onClick={() => setActiveTab('PRODUCTION')}
            className={`px-6 py-3 font-bold text-sm flex items-center gap-2 transition-all ${
                activeTab === 'PRODUCTION' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-500 hover:text-slate-800'
            }`}
         >
            <ListChecks size={18} /> Produção & Rastreio
         </button>
      </div>

      {activeTab === 'SUMMARY' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-left-2 duration-300">
            {/* Logistics Box */}
            <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                        <Box size={24} />
                    </div>
                    <div>
                        <p className="text-xs text-slate-400 uppercase font-bold">Caixa Física</p>
                        <div className="flex items-center gap-2">
                            <span className="font-bold text-xl text-slate-800">{job.boxNumber || '-'}</span>
                            {job.boxColor && (
                                <div 
                                    className="w-4 h-4 rounded-full shadow-sm border border-black/10" 
                                    style={{ backgroundColor: job.boxColor.hex }} 
                                    title={job.boxColor.name}
                                />
                            )}
                        </div>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                        <MapPin size={24} />
                    </div>
                    <div>
                        <p className="text-xs text-slate-400 uppercase font-bold">Local Atual</p>
                        <p className="font-bold text-lg text-slate-800">{job.currentSector || 'Recepção'}</p>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
                    <div className="p-3 bg-green-50 text-green-600 rounded-xl">
                        <DollarSign size={24} />
                    </div>
                    <div>
                        <p className="text-xs text-slate-400 uppercase font-bold">Valor Total</p>
                        <p className="font-bold text-lg text-slate-800">R$ {job.totalValue.toFixed(2)}</p>
                    </div>
                </div>
            </div>

            {/* Items List */}
            <div className="lg:col-span-3 bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-6 border-b border-slate-100">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <Layers size={20} className="text-slate-400" /> Itens do Pedido
                    </h3>
                </div>
                <div className="divide-y divide-slate-100">
                    {job.items.map((item, idx) => (
                        <div key={idx} className="p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center hover:bg-slate-50 gap-2">
                            <div>
                                <div className="font-bold text-slate-800 text-lg">
                                    <span className="text-blue-600 mr-2">{item.quantity}x</span> 
                                    {item.name}
                                </div>
                                <div className="flex flex-col sm:flex-row sm:items-center gap-2 mt-1">
                                    {item.selectedVariationIds && item.selectedVariationIds.length > 0 && (
                                        <p className="text-sm text-slate-500">
                                            Obs: Contém variações/adicionais
                                        </p>
                                    )}
                                    {item.commissionDisabled && (
                                        <span className="text-[10px] bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full font-bold border border-gray-300 w-fit">
                                            Sem Comissão
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div className="text-left sm:text-right w-full sm:w-auto flex justify-between sm:block">
                                <p className="font-bold text-slate-700">R$ {(item.price * item.quantity).toFixed(2)}</p>
                                <p className="text-xs text-slate-400">Unit: R$ {item.price.toFixed(2)}</p>
                            </div>
                        </div>
                    ))}
                </div>
                {job.notes && (
                    <div className="p-6 bg-yellow-50 border-t border-yellow-100">
                        <p className="text-xs font-bold text-yellow-700 uppercase mb-2">Observações</p>
                        <p className="text-yellow-900 text-sm italic">"{job.notes}"</p>
                    </div>
                )}
            </div>
        </div>
      )}

      {activeTab === 'PRODUCTION' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 animate-in fade-in slide-in-from-right-2 duration-300">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <Clock size={20} className="text-slate-500" /> Histórico de Movimentação
                </h3>
            </div>
            
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase">
                            <th className="p-4">Data / Hora</th>
                            <th className="p-4">Ação</th>
                            <th className="p-4">Setor</th>
                            <th className="p-4">Responsável</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {sortedHistory.map((event, index) => (
                            <tr key={event.id} className="hover:bg-slate-50">
                                <td className="p-4 text-sm text-slate-600">
                                    <div className="font-bold text-slate-800">{new Date(event.timestamp).toLocaleDateString()}</div>
                                    <div className="text-xs">{new Date(event.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                                </td>
                                <td className="p-4">
                                    <span className="font-bold text-slate-700">{event.action}</span>
                                </td>
                                <td className="p-4 text-sm text-slate-600">
                                    {event.sector ? (
                                        <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded-md font-medium text-xs">
                                            {event.sector}
                                        </span>
                                    ) : '-'}
                                </td>
                                <td className="p-4 flex items-center gap-2">
                                     <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-500">
                                        {event.userName.charAt(0)}
                                     </div>
                                     <span className="text-sm font-medium text-slate-700">{event.userName}</span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            
            <div className="p-6 text-center border-t border-slate-100">
                 <p className="text-xs text-slate-400">Total de registros: {job.history.length}</p>
            </div>
        </div>
      )}

    </div>
  );
};
