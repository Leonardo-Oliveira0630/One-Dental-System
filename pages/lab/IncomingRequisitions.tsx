import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useApp } from '../../context/AppContext';
import { OnlineRequisition, JobStatus, UserRole, JobItem, Attachment } from '../../types';
import { 
  ClipboardList, 
  Check, 
  X, 
  FileText, 
  Package, 
  Clock, 
  Eye, 
  User, 
  Stethoscope, 
  AlertCircle, 
  MessageSquare, 
  Paperclip, 
  ExternalLink,
  ChevronRight,
  Sparkles
} from 'lucide-react';
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
  const { t } = useTranslation();
  const { 
    onlineRequisitions, 
    updateOnlineRequisition, 
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

  // State for full detail modal
  const [selectedReqForModal, setSelectedReqForModal] = useState<OnlineRequisition | null>(null);

  // State for rejection justification modal
  const [rejectingReq, setRejectingReq] = useState<OnlineRequisition | null>(null);
  const [rejectionReasonInput, setRejectionReasonInput] = useState('');

  // Verify authorization (only laboratory managers and admins)
  const isAuthorized = currentUser?.role === UserRole.ADMIN || currentUser?.role === UserRole.MANAGER || currentUser?.role === UserRole.SUPER_ADMIN;

  if (!isAuthorized) {
    return (
      <div className="p-8 text-center text-slate-500 font-bold uppercase tracking-widest">
        {t('common.accessDenied', 'Acesso Negado')}
      </div>
    );
  }

  // Total counts for badges
  const pendingCount = (onlineRequisitions || []).filter(r => r.status === 'PENDING').length;
  const acceptedCount = (onlineRequisitions || []).filter(r => r.status === 'ACCEPTED').length;
  const rejectedCount = (onlineRequisitions || []).filter(r => r.status === 'REJECTED').length;
  const allCount = (onlineRequisitions || []).length;

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
    return req.dentistName || t('requisitions.partnerDentist', 'Dentista Parceiro');
  };

  const getDentistClinic = (req: OnlineRequisition) => {
    if (req.dentistClinicName) return req.dentistClinicName;
    const manual = manualDentists.find(d => d.id === req.dentistManualId);
    if (manual && manual.clinicName) return manual.clinicName;
    return t('requisitions.partnerClinic', 'Consultório Parceiro');
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

    if (selectedReqForModal) {
      setSelectedReqForModal(null);
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
    if (selectedReqForModal) {
      setSelectedReqForModal(null);
    }
    setRejectingReq(req);
    setRejectionReasonInput('');
  };

  const confirmRejection = async () => {
    if (!rejectingReq) return;
    if (!rejectionReasonInput.trim()) {
      alert(t('requisitions.fillRejectionReasonAlert', "Por favor, preencha o motivo da recusa."));
      return;
    }
    try {
      await updateOnlineRequisition(currentUser?.organizationId || '', rejectingReq.id, {
        status: 'REJECTED',
        rejectionReason: rejectionReasonInput.trim()
      });
      alert(t('requisitions.requisitionRejectedSuccess', "Requisição recusada com sucesso."));
      setRejectingReq(null);
      setRejectionReasonInput('');
    } catch (err: any) {
      console.error("Error rejecting requisition:", err);
      alert(t('requisitions.updateError', "Erro ao atualizar requisição."));
    }
  };

  const renderVariations = (serviceId?: string, variationIds?: string[]) => {
    if (!variationIds || variationIds.length === 0) return null;
    const service = jobTypes.find(t => t.id === serviceId);
    if (!service) return null;

    const matchedOptions: string[] = [];
    variationIds.forEach(varId => {
      if (service.variationGroups) {
        for (const g of service.variationGroups) {
          const opt = g.options?.find(o => o.id === varId);
          if (opt) {
            matchedOptions.push(`${g.name}: ${opt.name}`);
            break;
          }
        }
      }
    });

    if (matchedOptions.length === 0) return null;

    return (
      <div className="flex flex-wrap gap-1 mt-1">
        {matchedOptions.map((text, i) => (
          <span key={i} className="bg-slate-100 text-slate-700 border border-slate-200 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-tight">
            {text}
          </span>
        ))}
      </div>
    );
  };

  const renderTeeth = (teeth?: string[]) => {
    if (!teeth || teeth.length === 0) return null;
    return (
      <div className="flex flex-wrap gap-1 mt-1">
        <span className="bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-md px-1.5 py-0.5 text-[9px] font-black uppercase tracking-tight">
          {t('requisitions.teeth', 'Dentes')}: {teeth.join(', ')}
        </span>
      </div>
    );
  };

  return (
    <div className="px-3 py-3 sm:px-6 sm:py-6 max-w-7xl mx-auto space-y-4 sm:space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-800 flex items-center gap-2">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-2xl">
              <ClipboardList size={22} className="sm:w-6 sm:h-6" />
            </div>
            {t('requisitions.incoming.title', 'Requisições Online Recebidas')}
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            {t('requisitions.incoming.subtitle', 'Painel de recebimento de trabalhos e requisições enviadas pelos seus dentistas parceiros.')}
          </p>
        </div>

        {/* Tab Switcher - Responsive Grid on Mobile, Flex on Desktop */}
        <div className="w-full md:w-auto grid grid-cols-2 sm:flex bg-slate-100 p-1 rounded-2xl gap-1">
          <button
            onClick={() => setStatusFilter('PENDING')}
            className={`px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              statusFilter === 'PENDING' ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>{t('requisitions.status.PENDING', 'Pendentes')}</span>
            {pendingCount > 0 && (
              <span className="px-1.5 py-0.2 bg-amber-500 text-white rounded-full text-[10px] font-black">
                {pendingCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setStatusFilter('ACCEPTED')}
            className={`px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              statusFilter === 'ACCEPTED' ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>{t('requisitions.status.ACCEPTED', 'Aceitas')}</span>
            {acceptedCount > 0 && (
              <span className="px-1.5 py-0.2 bg-emerald-500 text-white rounded-full text-[10px] font-black">
                {acceptedCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setStatusFilter('REJECTED')}
            className={`px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              statusFilter === 'REJECTED' ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>{t('requisitions.status.REJECTED', 'Recusadas')}</span>
            {rejectedCount > 0 && (
              <span className="px-1.5 py-0.2 bg-rose-500 text-white rounded-full text-[10px] font-black">
                {rejectedCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              statusFilter === 'ALL' ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>{t('requisitions.status.ALL', 'Todas')}</span>
            <span className="text-[10px] text-slate-400 font-bold">({allCount})</span>
          </button>
        </div>
      </div>

      {/* Content Area */}
      {filteredReqs.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-12 text-center text-slate-400 italic">
          <Package size={40} className="mx-auto text-slate-300 mb-3" />
          {t('requisitions.incoming.noneFound', 'Nenhuma requisição encontrada com o filtro selecionado.')}
        </div>
      ) : (
        <>
          {/* MOBILE VIEW: Cards designed specifically for mobile screens */}
          <div className="block md:hidden space-y-3.5">
            {filteredReqs.map(req => {
              const reqItems = (req.items && req.items.length > 0) ? req.items : [
                {
                  id: req.serviceId || 'single',
                  serviceId: req.serviceId,
                  serviceName: req.serviceName,
                  quantity: req.quantity || 1,
                  selectedVariationIds: req.selectedVariationIds || [],
                  selectedTeeth: req.selectedTeeth || []
                }
              ];

              return (
                <div 
                  key={req.id} 
                  className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 space-y-3 hover:border-slate-300 transition-all"
                >
                  {/* Top: Dentist and Status */}
                  <div className="flex justify-between items-start gap-2 border-b border-slate-100 pb-2.5">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 text-xs font-black text-slate-800 truncate">
                        <Stethoscope size={14} className="text-blue-600 shrink-0" />
                        <span className="truncate">{getDentistName(req)}</span>
                      </div>
                      <div className="text-[11px] text-slate-400 font-medium truncate ml-5">
                        {getDentistClinic(req)}
                      </div>
                    </div>
                    
                    <span className={`shrink-0 inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${
                      req.status === 'PENDING' ? 'bg-amber-100 text-amber-800' :
                      req.status === 'ACCEPTED' ? 'bg-emerald-100 text-emerald-800' :
                      'bg-rose-100 text-rose-800'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        req.status === 'PENDING' ? 'bg-amber-500' :
                        req.status === 'ACCEPTED' ? 'bg-emerald-500' :
                        'bg-rose-500'
                      }`} />
                      {req.status === 'PENDING' ? t('requisitions.status.PENDING', 'Pendente') :
                       req.status === 'ACCEPTED' ? t('requisitions.status.ACCEPTED', 'Aceito') : t('requisitions.status.REJECTED', 'Recusado')}
                    </span>
                  </div>

                  {/* Patient Name & Date */}
                  <div className="flex justify-between items-center bg-slate-50/80 rounded-xl p-2.5">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0">
                        <User size={14} />
                      </div>
                      <div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block leading-none">
                          {t('requisitions.patient', 'Paciente')}
                        </span>
                        <span className="text-xs font-black text-slate-800">
                          {req.patientName}
                        </span>
                      </div>
                    </div>
                    <div className="text-[10px] text-slate-400 font-bold flex items-center gap-1">
                      <Clock size={11} className="shrink-0" />
                      {parseDateSafely(req.sentAt || req.createdAt)?.toLocaleDateString()}
                    </div>
                  </div>

                  {/* Order Items (Todo o Pedido) */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                      {t('requisitions.orderItems', 'Itens do Pedido')} ({reqItems.length})
                    </span>
                    <div className="space-y-2">
                      {reqItems.map((item, idx) => (
                        <div key={item.id || idx} className="bg-slate-50/60 border border-slate-100 rounded-xl p-2.5">
                          <div className="flex items-center justify-between">
                            <span className="bg-blue-50 text-blue-700 font-bold px-2 py-0.5 rounded-lg text-xs inline-block">
                              {item.quantity || 1}x {item.serviceName}
                            </span>
                          </div>
                          {renderTeeth(item.selectedTeeth)}
                          {renderVariations(item.serviceId, item.selectedVariationIds)}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Dentist Clinical Notes (Observações) */}
                  {req.notes && (
                    <div className="bg-amber-50/70 border border-amber-200/70 rounded-xl p-2.5 text-xs text-amber-950 flex gap-2">
                      <MessageSquare size={15} className="text-amber-600 shrink-0 mt-0.5" />
                      <div className="space-y-0.5 min-w-0">
                        <span className="text-[10px] font-black text-amber-800 uppercase tracking-wider block">
                          {t('requisitions.dentistNotes', 'Observações do Dentista')}:
                        </span>
                        <p className="text-xs text-amber-900 font-medium italic break-words">
                          "{req.notes}"
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Attached Files */}
                  {req.attachments && req.attachments.length > 0 && (
                    <div className="space-y-1">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                        <Paperclip size={11} /> {t('requisitions.attachments', 'Anexos')} ({req.attachments.length})
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {req.attachments.map((file, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => {
                              setSelectedAttachment(file);
                              setAllAttachmentsForPreview(req.attachments || []);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-blue-50 text-blue-700 border border-slate-200 rounded-lg text-xs font-bold transition-all max-w-full truncate"
                          >
                            <FileText size={12} className="shrink-0 text-blue-600" />
                            <span className="truncate max-w-[180px]">{file.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Rejection / Acceptance status note */}
                  {req.status === 'REJECTED' && (
                    <div className="bg-rose-50 border border-rose-200 rounded-xl p-2.5 text-xs text-rose-800 space-y-1">
                      <div className="font-bold flex items-center gap-1">
                        <AlertCircle size={13} className="text-rose-600" />
                        {t('requisitions.rejectReason', 'Motivo da Recusa')}:
                      </div>
                      <p className="text-xs text-rose-700 font-medium">
                        {req.rejectionReason || t('requisitions.noReasonSpecified', 'Sem justificativa especificada.')}
                      </p>
                      {req.rejectedAt && (
                        <div className="text-[10px] text-rose-500 font-bold">
                          {t('requisitions.rejectedOn', 'Recusado em')}: {parseDateSafely(req.rejectedAt)?.toLocaleString()}
                        </div>
                      )}
                    </div>
                  )}

                  {req.status === 'ACCEPTED' && req.acceptedAt && (
                    <div className="text-[10px] text-emerald-700 font-bold flex items-center gap-1 bg-emerald-50 px-2.5 py-1.5 rounded-lg border border-emerald-100">
                      <Check size={12} className="text-emerald-600 shrink-0" />
                      {t('requisitions.acceptedOn', 'Aceito em')}: {parseDateSafely(req.acceptedAt)?.toLocaleString()}
                    </div>
                  )}

                  {/* Mobile Actions */}
                  <div className="pt-2 border-t border-slate-100 flex flex-wrap gap-2">
                    <button
                      onClick={() => setSelectedReqForModal(req)}
                      className="flex-1 py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs flex items-center justify-center gap-1 transition-all"
                    >
                      <Eye size={14} /> {t('requisitions.viewFull', 'Ver Completo')}
                    </button>

                    {req.status === 'PENDING' && (
                      <>
                        <button
                          onClick={() => handleOpenAccept(req)}
                          className="flex-[1.5] py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-xs flex items-center justify-center gap-1 transition-all shadow-sm"
                        >
                          <Check size={15} /> {t('requisitions.acceptAndCreateOS', 'Aceitar e Criar O.S.')}
                        </button>
                        <button
                          onClick={() => handleReject(req)}
                          className="py-2 px-3 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold rounded-xl text-xs flex items-center justify-center gap-1 transition-all"
                        >
                          <X size={15} /> {t('requisitions.reject', 'Recusar')}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* DESKTOP VIEW: Clean responsive table with min-w-[900px] */}
          <div className="hidden md:block bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left border-collapse min-w-[900px]">
                <thead className="bg-slate-50 text-xs font-bold text-slate-500 uppercase border-b border-slate-100">
                  <tr>
                    <th className="p-4">{t('requisitions.dentistClinic', 'Dentista / Clínica')}</th>
                    <th className="p-4">{t('requisitions.patient', 'Paciente')}</th>
                    <th className="p-4">{t('requisitions.requestedServices', 'Serviços Solicitados')}</th>
                    <th className="p-4">{t('requisitions.dentistNotes', 'Observações')}</th>
                    <th className="p-4">{t('requisitions.attachments', 'Anexos')}</th>
                    <th className="p-4">{t('requisitions.statusLabel', 'Status')}</th>
                    <th className="p-4 text-right">{t('common.actions', 'Ações')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {filteredReqs.map(req => {
                    const reqItems = (req.items && req.items.length > 0) ? req.items : [
                      {
                        id: req.serviceId || 'single',
                        serviceId: req.serviceId,
                        serviceName: req.serviceName,
                        quantity: req.quantity || 1,
                        selectedVariationIds: req.selectedVariationIds || [],
                        selectedTeeth: req.selectedTeeth || []
                      }
                    ];

                    return (
                      <tr key={req.id} className="hover:bg-slate-50/60 transition">
                        {/* Dentist */}
                        <td className="p-4 align-top">
                          <div className="font-bold text-slate-800">{getDentistName(req)}</div>
                          <div className="text-xs text-slate-400 capitalize">{getDentistClinic(req)}</div>
                          <div className="text-[10px] text-slate-500 font-bold mt-1.5 flex items-center gap-1">
                            <Clock size={11} className="text-slate-400 shrink-0" />
                            {parseDateSafely(req.sentAt || req.createdAt)?.toLocaleString() || '---'}
                          </div>
                        </td>

                        {/* Patient */}
                        <td className="p-4 align-top font-bold text-slate-700">
                          {req.patientName}
                        </td>

                        {/* Items */}
                        <td className="p-4 align-top max-w-xs">
                          <div className="flex flex-col gap-2">
                            {reqItems.map((item, idx) => (
                              <div key={item.id || idx} className="space-y-0.5">
                                <span className="bg-blue-50 text-blue-700 font-bold px-2 py-0.5 rounded-lg text-xs inline-block">
                                  {item.quantity || 1}x {item.serviceName}
                                </span>
                                {renderTeeth(item.selectedTeeth)}
                                {renderVariations(item.serviceId, item.selectedVariationIds)}
                              </div>
                            ))}
                          </div>
                        </td>

                        {/* Notes */}
                        <td className="p-4 align-top max-w-[200px]">
                          {req.notes ? (
                            <div className="text-xs text-slate-600 bg-slate-50 border border-slate-100 p-2 rounded-xl italic break-words">
                              "{req.notes}"
                            </div>
                          ) : (
                            <span className="text-slate-400 text-xs italic font-light">{t('requisitions.noNotes', 'Sem observações')}</span>
                          )}
                        </td>

                        {/* Attachments */}
                        <td className="p-4 align-top">
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
                                  title={t('requisitions.clickToViewDownload', 'Clique para visualizar ou baixar')}
                                >
                                  <FileText size={12} className="shrink-0" />
                                  <span className="truncate max-w-[150px]">{file.name}</span>
                                </button>
                              ))}
                            </div>
                          ) : (
                            <span className="text-slate-400 text-xs font-light italic">{t('requisitions.noAttachments', 'Nenhum arquivo')}</span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="p-4 align-top">
                          <span className={`inline-block text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider ${
                            req.status === 'PENDING' ? 'bg-amber-100 text-amber-800' :
                            req.status === 'ACCEPTED' ? 'bg-emerald-100 text-emerald-800' :
                            'bg-rose-100 text-rose-800'
                          }`}>
                            {req.status === 'PENDING' ? t('requisitions.status.PENDING', 'Pendente') :
                             req.status === 'ACCEPTED' ? t('requisitions.status.ACCEPTED', 'Aceito') : t('requisitions.status.REJECTED', 'Recusado')}
                          </span>

                          {req.status === 'ACCEPTED' && req.acceptedAt && (
                            <div className="text-[10px] text-emerald-700 font-bold mt-1.5 flex items-center gap-1">
                              <Clock size={10} className="text-emerald-500 shrink-0" />
                              {parseDateSafely(req.acceptedAt)?.toLocaleDateString()}
                            </div>
                          )}

                          {req.status === 'REJECTED' && (
                            <div className="mt-1.5 space-y-0.5">
                              {req.rejectedAt && (
                                <div className="text-[10px] text-rose-600 font-bold flex items-center gap-1">
                                  <Clock size={10} className="text-rose-400 shrink-0" />
                                  {parseDateSafely(req.rejectedAt)?.toLocaleDateString()}
                                </div>
                              )}
                              {req.rejectionReason && (
                                <div className="text-xs text-rose-600 max-w-[180px] break-words font-medium">
                                  {t('requisitions.rejectReason', 'Motivo da Recusa')}: {req.rejectionReason}
                                </div>
                              )}
                            </div>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="p-4 align-top text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setSelectedReqForModal(req)}
                              className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-lg transition"
                              title={t('requisitions.viewFullOrderDetails', 'Ver Detalhes do Pedido Completo')}
                            >
                              <Eye size={16} />
                            </button>

                            {req.status === 'PENDING' ? (
                              <>
                                <button
                                  onClick={() => handleOpenAccept(req)}
                                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-2.5 py-1.5 rounded-lg text-xs flex items-center gap-1 transition shadow-sm"
                                  title={t('requisitions.openAndGenerateOS', 'Abrir e Gerar Ordem de Serviço')}
                                >
                                  <Check size={14} /> {t('common.accept', 'Aceitar')}
                                </button>
                                <button
                                  onClick={() => handleReject(req)}
                                  className="bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold px-2.5 py-1.5 rounded-lg text-xs flex items-center gap-1 transition"
                                  title={t('requisitions.rejectRequisition', 'Recusar Requisição')}
                                >
                                  <X size={14} /> {t('common.reject', 'Recusar')}
                                </button>
                              </>
                            ) : (
                              <span className="text-xs text-slate-400 italic">{t('common.completed', 'Concluído')}</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* MODAL: VER PEDIDO COMPLETO (Permite ao usuário mobile e desktop inspecionar todo o pedido que chegou) */}
      {selectedReqForModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] shadow-2xl border border-slate-100 flex flex-col overflow-hidden animate-scale-up">
            {/* Modal Header */}
            <div className="p-4 sm:p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-100 text-blue-700 rounded-xl">
                  <ClipboardList size={20} />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-slate-800">
                    {t('requisitions.modalDetailsTitle', 'Detalhes da Requisição Online')}
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-slate-400 font-bold">
                      ID: #{selectedReqForModal.id.slice(-6).toUpperCase()}
                    </span>
                    <span className={`inline-block text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${
                      selectedReqForModal.status === 'PENDING' ? 'bg-amber-100 text-amber-800' :
                      selectedReqForModal.status === 'ACCEPTED' ? 'bg-emerald-100 text-emerald-800' :
                      'bg-rose-100 text-rose-800'
                    }`}>
                      {selectedReqForModal.status === 'PENDING' ? t('requisitions.status.PENDING', 'Pendente') :
                       selectedReqForModal.status === 'ACCEPTED' ? t('requisitions.status.ACCEPTED', 'Aceito') : t('requisitions.status.REJECTED', 'Recusado')}
                    </span>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setSelectedReqForModal(null)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body - Scrollable */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-4 sm:space-y-5">
              {/* Dentist & Patient Info Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3.5 space-y-1">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                    {t('requisitions.dentistRequester', 'Dentista / Solicitante')}
                  </span>
                  <div className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                    <Stethoscope size={15} className="text-blue-600 shrink-0" />
                    <span>{getDentistName(selectedReqForModal)}</span>
                  </div>
                  <div className="text-xs text-slate-500 font-medium">
                    {getDentistClinic(selectedReqForModal)}
                  </div>
                  <div className="text-[10px] text-slate-400 font-bold flex items-center gap-1 pt-1">
                    <Clock size={11} /> {t('requisitions.receivedOn', 'Recebido em')}: {parseDateSafely(selectedReqForModal.sentAt || selectedReqForModal.createdAt)?.toLocaleString() || '---'}
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3.5 space-y-1">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                    {t('requisitions.patient', 'Paciente')}
                  </span>
                  <div className="font-black text-slate-800 text-base flex items-center gap-1.5">
                    <User size={16} className="text-blue-600 shrink-0" />
                    <span>{selectedReqForModal.patientName}</span>
                  </div>
                  <div className="text-xs text-slate-400 font-medium">
                    {t('requisitions.patientIdForOS', 'Identificação do paciente para a O.S.')}
                  </div>
                </div>
              </div>

              {/* Items List (Todo o Pedido) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Package size={15} className="text-blue-600" />
                    {t('requisitions.requestedItemsAndWork', 'Itens e Trabalhos Solicitados')}
                  </span>
                  <span className="text-xs text-slate-400 font-bold">
                    {(selectedReqForModal.items && selectedReqForModal.items.length > 0) ? selectedReqForModal.items.length : 1} {t('requisitions.itemsCount', 'item(ns)')}
                  </span>
                </div>

                <div className="space-y-2">
                  {((selectedReqForModal.items && selectedReqForModal.items.length > 0) ? selectedReqForModal.items : [
                    {
                      id: selectedReqForModal.serviceId || 'single',
                      serviceId: selectedReqForModal.serviceId,
                      serviceName: selectedReqForModal.serviceName,
                      quantity: selectedReqForModal.quantity || 1,
                      selectedVariationIds: selectedReqForModal.selectedVariationIds || [],
                      selectedTeeth: selectedReqForModal.selectedTeeth || []
                    }
                  ]).map((item, idx) => (
                    <div key={item.id || idx} className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-3 space-y-2">
                      <div className="flex justify-between items-start">
                        <span className="bg-blue-100 text-blue-800 font-black px-2.5 py-1 rounded-xl text-xs inline-block">
                          {item.quantity || 1}x {item.serviceName}
                        </span>
                        {item.quantity && item.quantity > 1 && (
                          <span className="text-[11px] font-bold text-slate-500">
                            {t('requisitions.qty', 'Qtd')}: {item.quantity} un
                          </span>
                        )}
                      </div>

                      {/* Teeth */}
                      {item.selectedTeeth && item.selectedTeeth.length > 0 && (
                        <div className="pt-1">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                            {t('requisitions.selectedTeeth', 'Dentes Selecionados')}:
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {item.selectedTeeth.map((tooth, tIdx) => (
                              <span key={tIdx} className="bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg px-2 py-0.5 text-xs font-black">
                                {tooth}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Variations */}
                      {item.selectedVariationIds && item.selectedVariationIds.length > 0 && (
                        <div className="pt-1">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                            {t('requisitions.specsAndVariations', 'Especificações & Variações')}:
                          </span>
                          {renderVariations(item.serviceId, item.selectedVariationIds)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Notes Section */}
              {selectedReqForModal.notes && (
                <div className="space-y-1.5">
                  <span className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <MessageSquare size={15} className="text-amber-600" />
                    {t('requisitions.clinicalNotesAndInstructions', 'Observações e Instruções Clínicas')}
                  </span>
                  <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-3.5 text-xs text-amber-950 font-medium whitespace-pre-wrap leading-relaxed">
                    "{selectedReqForModal.notes}"
                  </div>
                </div>
              )}

              {/* Attachments Section */}
              {selectedReqForModal.attachments && selectedReqForModal.attachments.length > 0 && (
                <div className="space-y-2">
                  <span className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Paperclip size={15} className="text-blue-600" />
                    {t('requisitions.filesAndAttachments', 'Arquivos e Anexos')} ({selectedReqForModal.attachments.length})
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {selectedReqForModal.attachments.map((file, i) => (
                      <div 
                        key={i}
                        className="bg-slate-50 border border-slate-200 rounded-2xl p-2.5 flex items-center justify-between gap-2"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="p-2 bg-blue-100 text-blue-700 rounded-xl shrink-0">
                            <FileText size={16} />
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-slate-800 truncate" title={file.name}>
                              {file.name}
                            </div>
                            {(file as any).size ? (
                              <div className="text-[10px] text-slate-400 font-medium">
                                {(((file as any).size) / 1024 / 1024).toFixed(2)} MB
                              </div>
                            ) : null}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setSelectedAttachment(file);
                            setAllAttachmentsForPreview(selectedReqForModal.attachments || []);
                          }}
                          className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shrink-0 transition flex items-center gap-1"
                        >
                          <Eye size={12} /> {t('common.view', 'Ver')}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Status information for Accepted / Rejected */}
              {selectedReqForModal.status === 'REJECTED' && (
                <div className="bg-rose-50 border border-rose-200 rounded-2xl p-3.5 space-y-1.5">
                  <div className="text-xs font-black text-rose-800 flex items-center gap-1.5">
                    <AlertCircle size={16} className="text-rose-600" />
                    {t('requisitions.rejectJustification', 'Justificativa da Recusa')}
                  </div>
                  <p className="text-xs text-rose-700 font-medium leading-relaxed">
                    {selectedReqForModal.rejectionReason || t('requisitions.noReasonSpecified', 'Sem justificativa informada.')}
                  </p>
                  {selectedReqForModal.rejectedAt && (
                    <div className="text-[10px] text-rose-500 font-bold">
                      {t('requisitions.rejectionDate', 'Data da recusa')}: {parseDateSafely(selectedReqForModal.rejectedAt)?.toLocaleString()}
                    </div>
                  )}
                </div>
              )}

              {selectedReqForModal.status === 'ACCEPTED' && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3.5 space-y-1">
                  <div className="text-xs font-black text-emerald-800 flex items-center gap-1.5">
                    <Check size={16} className="text-emerald-600" />
                    {t('requisitions.processedAndAccepted', 'Requisição Processada e Aceita')}
                  </div>
                  {selectedReqForModal.acceptedAt && (
                    <div className="text-[11px] text-emerald-700 font-medium">
                      {t('requisitions.acceptedOn', 'Aceita em')}: {parseDateSafely(selectedReqForModal.acceptedAt)?.toLocaleString()}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3 sm:p-4 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row justify-end items-stretch sm:items-center gap-2">
              <button
                type="button"
                onClick={() => setSelectedReqForModal(null)}
                className="py-2.5 px-4 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl text-xs transition"
              >
                {t('common.close', 'Fechar')}
              </button>

              {selectedReqForModal.status === 'PENDING' && (
                <>
                  <button
                    type="button"
                    onClick={() => handleReject(selectedReqForModal)}
                    className="py-2.5 px-4 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold rounded-xl text-xs transition flex items-center justify-center gap-1.5"
                  >
                    <X size={15} /> {t('requisitions.rejectRequisition', 'Recusar Requisição')}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenAccept(selectedReqForModal)}
                    className="py-2.5 px-6 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-xs transition flex items-center justify-center gap-1.5 shadow-md shadow-emerald-200"
                  >
                    <Check size={16} /> {t('requisitions.acceptAndCreateOS', 'Aceitar e Criar O.S.')}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Attachment Preview Modal */}
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in" id="rejectionModal">
          <div className="bg-white rounded-3xl p-4 sm:p-6 w-full max-w-md shadow-2xl border border-slate-100 animate-scale-up">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base sm:text-lg font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
                <X className="text-rose-500" size={20} /> {t('requisitions.rejectModalTitle', 'Recusar Requisição')}
              </h3>
              <button 
                onClick={() => setRejectingReq(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition"
              >
                <X size={20} />
              </button>
            </div>
            
            <p className="text-xs text-slate-500 mb-4 font-medium leading-relaxed">
              {t('requisitions.rejectModalNotice', {
                patient: rejectingReq.patientName,
                dentist: getDentistName(rejectingReq),
                defaultValue: `Informe a justificativa de recusa para ${rejectingReq.patientName} (enviada por ${getDentistName(rejectingReq)}). O dentista parceiro poderá visualizar o motivo, corrigir as informações e reenviar o caso.`
              })}
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">
                  {t('requisitions.rejectReasonLabel', 'Justificativa / Motivo da Recusa *')}
                </label>
                <textarea
                  value={rejectionReasonInput}
                  onChange={(e) => setRejectionReasonInput(e.target.value)}
                  placeholder={t('requisitions.rejectReasonPlaceholder', 'Ex: Escaneamento com distorção no dente 21, favor reenviar escaneamento...')}
                  rows={4}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-all resize-none"
                  required
                />
              </div>
            </div>

            <div className="flex gap-2 sm:gap-3 mt-6 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setRejectingReq(null)}
                className="flex-1 py-3 text-slate-500 hover:bg-slate-100 rounded-2xl text-xs font-black uppercase transition-all"
              >
                {t('common.cancel', 'Cancelar')}
              </button>
              <button
                type="button"
                onClick={confirmRejection}
                className="flex-[2] py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl text-xs font-black uppercase shadow-lg shadow-rose-100 flex items-center justify-center gap-1.5 transition-all"
              >
                <Check size={16} /> {t('requisitions.confirmRejection', 'Confirmar Recusa')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
