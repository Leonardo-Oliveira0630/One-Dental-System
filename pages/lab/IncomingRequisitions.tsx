import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { OnlineRequisition, Job, JobStatus, UserRole, JobItem, Attachment } from '../../types';
import { ClipboardList, Check, X, FileText, Package, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AttachmentPreviewModal } from '../../components/AttachmentPreviewModal';

const parseDateSafely = (val: any): Date | null => {
    if (!val) return null;
    if (val instanceof Date) return val;
    if (val.seconds) return new Date(val.seconds * 1000);
    try {
        const d = new Date(val);
        if (!isNaN(d.getTime())) return d;
    } catch (e) {}
    return null;
};

export const IncomingRequisitions = () => {
  const { 
    onlineRequisitions, 
    updateOnlineRequisition, 
    addJob, 
    jobs, 
    currentUser, 
    manualDentists, 
    allUsers, 
    jobTypes
  } = useApp();

  const navigate = useNavigate();

  // State for attachment previews
  const [selectedAttachment, setSelectedAttachment] = useState<Attachment | null>(null);
  const [allAttachmentsForPreview, setAllAttachmentsForPreview] = useState<Attachment[]>([]);

  // Filtering status for list
  const [statusFilter, setStatusFilter] = useState<'PENDING' | 'ACCEPTED' | 'REJECTED' | 'ALL'>('PENDING');

  // State for rejection justification modal
  const [rejectingReq, setRejectingReq] = useState<OnlineRequisition | null>(null);
  const [rejectionReasonInput, setRejectionReasonInput] = useState('');

  // Verify authorization (only laboratory managers and admins)
  const isAuthorized = currentUser?.role === UserRole.ADMIN || currentUser?.role === UserRole.MANAGER || currentUser?.role === UserRole.SUPER_ADMIN;

  if (!isAuthorized) {
    return <div className="p-8 text-center text-slate-500 font-bold uppercase tracking-widest">Acesso Negado</div>;
  }

  // Get filtered requisitions list
  const filteredReqs = (onlineRequisitions || []).filter(r => {
    if (statusFilter === 'ALL') return true;
    return r.status === statusFilter;
  });

  const getDentistName = (req: OnlineRequisition) => {
    const manual = manualDentists.find(d => d.id === req.dentistManualId);
    if (manual) return manual.name;
    const user = allUsers.find(u => u.id === req.dentistId);
    if (user) return user.name;
    return req.dentistName || 'Dentista Interno';
  };

  const handleOpenAccept = (req: OnlineRequisition) => {
    
    let items: JobItem[] = [];
    
    if (req.items && req.items.length > 0) {
        items = req.items.map((reqItem, idx) => {
            const service = jobTypes.find(t => t.id === reqItem.serviceId);
            const basePrice = service ? service.basePrice : 0;
            return {
              id: `item_${Date.now()}_${idx}`,
              jobTypeId: reqItem.serviceId,
              name: reqItem.serviceName,
              quantity: reqItem.quantity && reqItem.quantity > 0 ? reqItem.quantity : 1,
              price: basePrice,
              nature: 'NORMAL',
              selectedVariationIds: reqItem.selectedVariationIds || [],
              selectedTeeth: reqItem.selectedTeeth || []
            };
        });
    } else {
        const service = jobTypes.find(t => t.id === req.serviceId);
        const basePrice = service ? service.basePrice : 0;
        
        items = [{
          id: `item_${Date.now()}`,
          jobTypeId: req.serviceId,
          name: req.serviceName,
          quantity: req.quantity && req.quantity > 0 ? req.quantity : 1,
          price: basePrice,
          nature: 'NORMAL',
          selectedVariationIds: req.selectedVariationIds || [],
          selectedTeeth: req.selectedTeeth || []
        }];
    }

    // Navigate to /new-job with populated state
    navigate('/new-job', {
      state: {
        patientName: req.patientName,
        dentistId: req.dentistId || req.dentistManualId,
        dentistName: getDentistName(req),
        items: items,
        notes: req.notes || '',
        origin: 'ONLINE_REQUISITION',
        onlineRequisitionId: req.id,
        attachments: req.attachments || []
      }
    });
  };

  const handleReject = (req: OnlineRequisition) => {
    setRejectingReq(req);
    setRejectionReasonInput('');
  };

  const confirmRejection = async () => {
    if (!rejectingReq) return;
    if (!rejectionReasonInput.trim()) {
      alert("Por favor, preencha o motivo da recusa.");
      return;
    }
    try {
      await updateOnlineRequisition(currentUser?.organizationId || '', rejectingReq.id, {
        status: 'REJECTED',
        rejectionReason: rejectionReasonInput.trim()
      });
      alert("Requisição recusada com sucesso.");
      setRejectingReq(null);
      setRejectionReasonInput('');
    } catch (err: any) {
      console.error("Error rejecting requisition:", err);
      alert("Erro ao atualizar requisição.");
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
            <ClipboardList className="text-blue-600" size={28} />
            Requisições Online Recebidas
          </h2>
          <p className="text-sm text-slate-500">
            Painel de recebimento de trabalhos e requisições enviadas pelos seus dentistas cadastrados.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setStatusFilter('PENDING')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${statusFilter === 'PENDING' ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-800'}`}
          >
            Pendentes
          </button>
          <button
            onClick={() => setStatusFilter('ACCEPTED')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${statusFilter === 'ACCEPTED' ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-800'}`}
          >
            Aceitas
          </button>
          <button
            onClick={() => setStatusFilter('REJECTED')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${statusFilter === 'REJECTED' ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-800'}`}
          >
            Recusadas
          </button>
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${statusFilter === 'ALL' ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-800'}`}
          >
            Ver Todas
          </button>
        </div>
      </div>

      {/* Main List */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        {filteredReqs.length === 0 ? (
          <div className="p-16 text-center text-slate-400 italic">
            Nenhuma requisição encontrada com o filtro selecionado.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 text-xs font-bold text-slate-500 uppercase border-b border-slate-100">
                <tr>
                  <th className="p-4">Dentista / Clínica</th>
                  <th className="p-4">Paciente</th>
                  <th className="p-4">Serviço Solicitado</th>
                  <th className="p-4">Anexos / Arquivos</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100/80 text-sm">
                {filteredReqs.map(req => (
                  <tr key={req.id} className="hover:bg-slate-50/50 transition">
                    <td className="p-4">
                      <div className="font-bold text-slate-800">{getDentistName(req)}</div>
                      <div className="text-xs text-slate-400 capitalize">{req.dentistClinicName || 'Consultório Parceiro'}</div>
                      <div className="text-[10px] text-slate-500 font-bold mt-1.5 flex items-center gap-1">
                        <Clock size={10} className="text-slate-400 shrink-0" /> {parseDateSafely(req.sentAt || req.createdAt)?.toLocaleString('pt-BR') || '---'}
                      </div>
                    </td>
                    <td className="p-4 font-bold text-slate-700">
                      {req.patientName}
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col gap-1.5 align-start">
                        {req.items && req.items.length > 0 ? (
                            req.items.map(item => (
                              <div key={item.id} className="mb-2">
                                <span className="bg-blue-50 text-blue-700 font-bold px-2 py-1 rounded-lg text-xs w-fit inline-block">
                                  {item.quantity || 1}x {item.serviceName}
                                </span>
                                {item.selectedVariationIds && item.selectedVariationIds.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {(() => {
                                      const service = jobTypes.find(t => t.id === item.serviceId);
                                      if (!service) return null;
                                      return item.selectedVariationIds.map(varId => {
                                        let foundOptionName = '';
                                        if (service.variationGroups) {
                                          for (const g of service.variationGroups) {
                                            const opt = g.options?.find(o => o.id === varId);
                                            if (opt) {
                                              foundOptionName = `${g.name}: ${opt.name}`;
                                              break;
                                            }
                                          }
                                        }
                                        if (!foundOptionName) return null;
                                        return (
                                          <span key={varId} className="bg-slate-100 text-slate-700 border border-slate-200 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-tight">
                                            {foundOptionName}
                                          </span>
                                        );
                                      });
                                    })()}
                                  </div>
                                )}
                              </div>
                            ))
                        ) : (
                            <>
                                <span className="bg-blue-50 text-blue-700 font-bold px-2 py-1 rounded-lg text-xs w-fit">
                                  {req.serviceName}
                                </span>
                                {req.quantity && req.quantity > 0 && (
                                  <div className="text-[11px] font-bold text-slate-500">
                                    Qtd: {req.quantity} {req.quantity === 1 ? 'item' : 'itens/dentes'}
                                  </div>
                                )}
                                {req.selectedVariationIds && req.selectedVariationIds.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {(() => {
                                      const service = jobTypes.find(t => t.id === req.serviceId);
                                      if (!service) return null;
                                      return req.selectedVariationIds.map(varId => {
                                        let foundOptionName = '';
                                        if (service.variationGroups) {
                                          for (const g of service.variationGroups) {
                                            const opt = g.options?.find(o => o.id === varId);
                                            if (opt) {
                                              foundOptionName = `${g.name}: ${opt.name}`;
                                              break;
                                            }
                                          }
                                        }
                                        if (!foundOptionName) return null;
                                        return (
                                          <span key={varId} className="bg-slate-100 text-slate-700 border border-slate-200 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-tight">
                                            {foundOptionName}
                                          </span>
                                        );
                                      });
                                    })()}
                                  </div>
                                )}
                            </>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      {req.attachments && req.attachments.length > 0 ? (
                        <div className="flex flex-col gap-1 text-xs">
                          {req.attachments.map((file, i) => (
                            <button
                              key={i}
                              onClick={() => {
                                setSelectedAttachment(file);
                                setAllAttachmentsForPreview(req.attachments || []);
                              }}
                              className="text-blue-600 hover:underline hover:text-blue-800 flex items-center gap-1 font-semibold text-left focus:outline-none"
                              title="Clique para visualizar ou baixar"
                            >
                              <FileText size={12} className="shrink-0" /> <span className="truncate max-w-[155px]">{file.name}</span>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-400 text-xs font-light italic">Nenhum arquivo</span>
                      )}
                    </td>
                    <td className="p-4">
                      <span className={`inline-block text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider ${
                        req.status === 'PENDING' ? 'bg-amber-100 text-amber-800' :
                        req.status === 'ACCEPTED' ? 'bg-emerald-100 text-emerald-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {req.status === 'PENDING' ? 'Pendente' :
                         req.status === 'ACCEPTED' ? 'Aceito' : 'Recusado'}
                      </span>
                      {req.status === 'ACCEPTED' && req.acceptedAt && (
                        <div className="text-[10px] text-emerald-700 font-bold mt-1.5 flex items-center gap-1">
                          <Clock size={10} className="text-emerald-500 shrink-0" /> Aceito em: {parseDateSafely(req.acceptedAt)?.toLocaleString('pt-BR') || '---'}
                        </div>
                      )}
                      {req.status === 'REJECTED' && req.rejectedAt && (
                        <div className="text-[10px] text-red-750 font-bold mt-1.5 flex items-center gap-1">
                          <Clock size={10} className="text-red-400 shrink-0" /> Recusado em: {parseDateSafely(req.rejectedAt)?.toLocaleString('pt-BR') || '---'}
                        </div>
                      )}
                      {req.status === 'REJECTED' && req.rejectionReason && (
                        <div className="mt-1 text-xs text-red-600 max-w-[200px] break-words font-medium">
                          Motivo: {req.rejectionReason}
                        </div>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      {req.status === 'PENDING' ? (
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleOpenAccept(req)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold p-1.5 rounded-lg text-xs flex items-center gap-1 transition"
                            title="Abrir e Editar como Ordem de Serviço"
                          >
                            <Check size={14} /> Aceitar
                          </button>
                          <button
                            onClick={() => handleReject(req)}
                            className="bg-red-50 hover:bg-red-100 text-red-600 font-bold p-1.5 rounded-lg text-xs flex items-center gap-1 transition"
                          >
                            <X size={14} /> Recusar
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 italic">Processada</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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

      {/* Modal de Justificativa de Recusa */}
      {rejectingReq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in" id="rejectionModal">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-slate-100 animate-scale-up">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
                <X className="text-red-500" size={20} /> Recusar Requisição
              </h3>
              <button 
                onClick={() => setRejectingReq(null)}
                className="text-slate-400 hover:text-slate-600 transition"
              >
                <X size={20} />
              </button>
            </div>
            
            <p className="text-xs text-slate-500 mb-4 font-medium leading-relaxed">
              Informe a justificativa de recusa para <strong>{rejectingReq.patientName}</strong> (enviada por {getDentistName(rejectingReq)}). O dentista poderá visualizar o motivo, corrigir as informações e reenviar o caso.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Justificativa / Motivo da Recusa *</label>
                <textarea
                  value={rejectionReasonInput}
                  onChange={(e) => setRejectionReasonInput(e.target.value)}
                  placeholder="Ex: Escaneamento com distorção no dente 21, favor reenviar escaneamento..."
                  rows={4}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-all resize-none animate-none"
                  required
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6 pt-4 border-t border-slate-100">
              <button
                onClick={() => setRejectingReq(null)}
                className="flex-1 py-3 text-slate-500 hover:bg-slate-50 rounded-2xl text-xs font-black uppercase transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={confirmRejection}
                className="flex-[2] py-3 bg-red-600 hover:bg-red-700 text-white rounded-2xl text-xs font-black uppercase shadow-lg shadow-red-100 flex items-center justify-center gap-1.5 transition-all"
              >
                <Check size={16} /> Confirmar Recusa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
