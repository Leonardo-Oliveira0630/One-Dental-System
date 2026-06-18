import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { OnlineRequisition, Job, JobStatus, UrgencyLevel, UserRole, BoxColor, JobItem } from '../../types';
import { ClipboardList, Check, X, FileText, Download, Calendar, Loader2, AlertCircle, ShoppingBag, Eye, DollarSign, Package } from 'lucide-react';

export const IncomingRequisitions = () => {
  const { 
    onlineRequisitions, 
    updateOnlineRequisition, 
    addJob, 
    jobs, 
    currentUser, 
    manualDentists, 
    allUsers, 
    sectors, 
    boxColors,
    jobTypes
  } = useApp();

  const [selectedReq, setSelectedReq] = useState<OnlineRequisition | null>(null);
  const [isAccepting, setIsAccepting] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Acceptance Form States
  const [osInput, setOsInput] = useState('');
  const [priceInput, setPriceInput] = useState('0.00');
  const [boxNum, setBoxNum] = useState('');
  const [boxColorId, setBoxColorId] = useState('');
  const [dueDateStr, setDueDateStr] = useState('');
  const [notes, setNotes] = useState('');

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
    // Generate next sequential OS number
    let maxId = 0;
    jobs.forEach(j => {
      const num = parseInt(j.osNumber?.split('-')[0] || '0');
      if (!isNaN(num) && num > maxId) maxId = num;
    });
    const nextId = (maxId + 1).toString().padStart(4, '0');

    // Fetch original service base price if available
    const service = jobTypes.find(t => t.id === req.serviceId);
    const basePrice = service ? service.basePrice : 0;

    setOsInput(nextId);
    setPriceInput(basePrice.toFixed(2));
    setBoxNum('');
    setBoxColorId(boxColors[0]?.id || '');
    
    // Default due date to 5 days from now
    const fiveDaysOut = new Date();
    fiveDaysOut.setDate(fiveDaysOut.getDate() + 5);
    setDueDateStr(fiveDaysOut.toISOString().split('T')[0]);
    
    setNotes(req.notes || '');
    setSelectedReq(req);
    setIsAccepting(true);
  };

  const confirmAccept = async () => {
    if (!selectedReq) return;
    setIsProcessing(true);

    try {
      const initialSector = sectors[0]?.name || 'Recepção';
      const selectedBoxColor = boxColors.find(c => c.id === boxColorId);
      const value = parseFloat(priceInput) || 0;

      // 1. Setup job fields
      const newJobId = `job_${Date.now()}`;
      const newJob: Job = {
        id: newJobId,
        organizationId: currentUser?.organizationId || '',
        osNumber: osInput,
        patientName: selectedReq.patientName,
        dentistId: selectedReq.dentistManualId || selectedReq.dentistId,
        dentistName: getDentistName(selectedReq),
        status: JobStatus.PENDING,
        urgency: UrgencyLevel.NORMAL,
        items: [{
          id: `item_${Date.now()}`,
          jobTypeId: selectedReq.serviceId,
          name: selectedReq.serviceName,
          quantity: 1,
          price: value,
          nature: 'NORMAL',
          selectedVariationIds: []
        }],
        history: [{
          id: `hist_${Date.now()}`,
          timestamp: new Date(),
          action: `OS ${osInput} criado de requisição online`,
          userId: currentUser?.id || '',
          userName: currentUser?.name || '',
          sector: initialSector
        }],
        sectorMovements: [{
          id: `mov_${Date.now()}`,
          sector: initialSector,
          entryTime: new Date(),
          entryUserId: currentUser?.id || '',
          entryUserName: currentUser?.name || ''
        }],
        createdAt: new Date(),
        dueDate: new Date(dueDateStr + 'T18:00:00'),
        boxNumber: boxNum,
        boxColor: selectedBoxColor,
        currentSector: initialSector,
        totalValue: value,
        notes: notes,
        attachments: selectedReq.attachments || [],
        paymentStatus: 'PENDING'
      };

      // 2. Add as an active job in Lab
      await addJob(newJob);

      // 3. Complete Requisition Status in Database
      await updateOnlineRequisition(currentUser?.organizationId || '', selectedReq.id, {
        status: 'ACCEPTED',
        acceptedAsJobId: newJobId
      });

      alert("Requisição aceita e convertida em Ordem de Serviço com sucesso!");
      setIsAccepting(false);
      setSelectedReq(null);
    } catch (err: any) {
      console.error("Error accepting requisition:", err);
      alert("Erro ao aceitar requisição: " + (err.message || 'Verifique os campos'));
    } finally {
      setIsProcessing(false);
    }
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

      {/* Acceptance Entry Dialog (Modal) */}
      {isAccepting && selectedReq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl my-auto animate-in zoom-in duration-150">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-3xl">
              <h3 className="text-lg font-black flex items-center gap-2 text-slate-800">
                <Package className="text-blue-600" /> Ativar Ordem de Serviço (OS)
              </h3>
              <button 
                onClick={() => setIsAccepting(false)} 
                className="text-slate-400 hover:text-slate-600 transition"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100/60 text-xs text-slate-700 space-y-1">
                <div><strong>Dentista:</strong> {getDentistName(selectedReq)}</div>
                <div><strong>Paciente:</strong> {selectedReq.patientName}</div>
                <div><strong>Serviço:</strong> {selectedReq.serviceName}</div>
                {selectedReq.notes && <div><strong>Notas do Caso:</strong> {selectedReq.notes}</div>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 ml-1">Número da OS *</label>
                  <input
                    type="text"
                    required
                    value={osInput}
                    onChange={(e) => setOsInput(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 ml-1">Valor do Serviço (R$)</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 text-xs">R$</span>
                    <input
                      type="number"
                      step="0.01"
                      value={priceInput}
                      onChange={(e) => setPriceInput(e.target.value)}
                      className="w-full pl-8 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 ml-1">Próxima Entrega / Prazo</label>
                  <input
                    type="date"
                    required
                    value={dueDateStr}
                    onChange={(e) => setDueDateStr(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 ml-1">Cor da Caixa</label>
                  <select
                    value={boxColorId}
                    onChange={(e) => setBoxColorId(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    {boxColors.map(color => (
                      <option key={color.id} value={color.id}>
                        {color.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 ml-1">Número da Caixa</label>
                  <input
                    type="text"
                    value={boxNum}
                    onChange={(e) => setBoxNum(e.target.value)}
                    placeholder="Ex: 12"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 ml-1">Observações Operacionais</label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-slate-700 text-xs"
                  />
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 flex justify-end gap-3 rounded-b-3xl bg-slate-50/50">
              <button
                onClick={() => setIsAccepting(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 transition"
              >
                Cancelar
              </button>
              <button
                onClick={confirmAccept}
                disabled={isProcessing}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5 py-2 rounded-xl text-xs flex items-center gap-1 transition"
              >
                {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirmar e Iniciar OS'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
