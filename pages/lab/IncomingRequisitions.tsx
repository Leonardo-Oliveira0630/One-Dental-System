import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { OnlineRequisition, Job, JobStatus, UserRole, JobItem } from '../../types';
import { ClipboardList, Check, X, FileText, Package } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

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

  // Filtering status for list
  const [statusFilter, setStatusFilter] = useState<'PENDING' | 'ACCEPTED' | 'REJECTED' | 'ALL'>('PENDING');

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
    // Fetch original service base price if available
    const service = jobTypes.find(t => t.id === req.serviceId);
    const basePrice = service ? service.basePrice : 0;

    const items: JobItem[] = [{
      id: `item_${Date.now()}`,
      jobTypeId: req.serviceId,
      name: req.serviceName,
      quantity: 1,
      price: basePrice,
      nature: 'NORMAL',
      selectedVariationIds: []
    }];

    // Navigate to /new-job with populated state
    navigate('/new-job', {
      state: {
        patientName: req.patientName,
        dentistId: req.dentistManualId || req.dentistId,
        dentistName: getDentistName(req),
        items: items,
        notes: req.notes || '',
        origin: 'ONLINE_REQUISITION',
        onlineRequisitionId: req.id
      }
    });
  };

  const handleReject = async (req: OnlineRequisition) => {
    const confirm = window.confirm(`Deseja recusar a requisição de ${getDentistName(req)} para o paciente ${req.patientName}?`);
    if (!confirm) return;

    try {
      await updateOnlineRequisition(currentUser?.organizationId || '', req.id, {
        status: 'REJECTED'
      });
      alert("Requisição marcada como Recusada.");
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
                    </td>
                    <td className="p-4 font-bold text-slate-700">
                      {req.patientName}
                    </td>
                    <td className="p-4">
                      <span className="bg-blue-50 text-blue-700 font-bold px-2 py-1 rounded-lg text-xs">
                        {req.serviceName}
                      </span>
                    </td>
                    <td className="p-4">
                      {req.attachments && req.attachments.length > 0 ? (
                        <div className="flex flex-col gap-1 text-xs">
                          {req.attachments.map((file, i) => (
                            <a
                              key={i}
                              href={file.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline flex items-center gap-1 font-medium"
                            >
                              <FileText size={12} /> {file.name}
                            </a>
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
    </div>
  );
};
