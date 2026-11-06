import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { JobStatus, Job, UserRole } from '../../types';
import { DollarSign, Search, Calendar, Plus, Download, History, ArrowUpCircle, ArrowDownCircle, Mail, AlertCircle, Trash2 } from 'lucide-react';
import { calculateJobSearchScore, parseBrazilianCurrency } from '../../utils/stringUtils';

export const Finance: React.FC = () => {
  const { jobs, manualDentists, allUsers, dentistPayments, addDentistPayment } = useApp();

  const [filterStartDate, setFilterStartDate] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
  });
  const [filterEndDate, setFilterEndDate] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0];
  });

  const [selectedClient, setSelectedClient] = useState<any | null>(null);
  const [showStatementModal, setShowStatementModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const [showManualModal, setShowManualModal] = useState(false);
  const [manualEntryType, setManualEntryType] = useState<'PAYMENT' | 'MANUAL_DEBIT' | 'MANUAL_CREDIT'>('PAYMENT');
  const [manualAmount, setManualAmount] = useState('');
  const [manualNotes, setManualNotes] = useState('');

  // Clients list for finance
  const clients = useMemo(() => {
    const list = [...manualDentists, ...allUsers.filter(u => u.role === UserRole.CLIENT)];
    if (!searchTerm.trim()) return list;
    return list.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [manualDentists, allUsers, searchTerm]);

  // Chronological Statement logic (using completedAt for completion dates)
  const chronoHistory = useMemo(() => {
    if (!selectedClient) return { history: [], previousBalance: 0, overallBalance: 0 };

    const clientJobs = jobs.filter(j => 
      j.dentistId === selectedClient.id && 
      (j.status === JobStatus.COMPLETED || j.status === JobStatus.DELIVERED)
    );
    const clientPayments = dentistPayments.filter(p => p.dentistId === selectedClient.id);

    const history = [
      ...clientJobs.map(j => ({
        id: j.id,
        date: j.completedAt || j.deliveredAt || j.createdAt,
        type: 'DEBIT' as const,
        description: `OS #${j.osNumber || j.id.slice(-4)} - Paciente: ${j.patientName}`,
        amount: j.totalValue || 0,
        job: j
      })),
      ...clientPayments.map(p => ({
        id: p.id,
        date: typeof p.paymentDate === 'string' ? p.paymentDate : p.paymentDate.toISOString(),
        type: p.type === 'MANUAL_DEBIT' ? ('DEBIT' as const) : ('CREDIT' as const),
        description: p.notes || (p.type === 'MANUAL_DEBIT' ? 'Débito Manual' : `Recebimento (${p.paymentMethod})`),
        amount: p.amount,
        payment: p
      }))
    ];

    const sorted = history.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const sDate = filterStartDate ? new Date(`${filterStartDate}T00:00:00`) : new Date(0);
    const eDate = filterEndDate ? new Date(`${filterEndDate}T23:59:59`) : new Date(8640000000000000);

    let runningBalance = 0;
    let previousBalance = 0;

    const historyWithBalance = sorted.map(item => {
      if (item.type === 'DEBIT') runningBalance -= item.amount;
      else runningBalance += item.amount;

      const isBefore = new Date(item.date) < sDate;
      if (isBefore) previousBalance = runningBalance;

      return { ...item, balanceAfter: runningBalance };
    });

    const filteredHistory = historyWithBalance.filter(item => {
      const d = new Date(item.date);
      return d >= sDate && d <= eDate;
    });

    return { history: filteredHistory, previousBalance, overallBalance: runningBalance };
  }, [selectedClient, jobs, dentistPayments, filterStartDate, filterEndDate]);

  const handleAddPayment = async () => {
    if (!selectedClient) return;
    const amt = parseBrazilianCurrency(manualAmount);
    if (amt <= 0) {
      alert('Digite um valor válido.');
      return;
    }

    await addDentistPayment({
      dentistId: selectedClient.id,
      dentistName: selectedClient.name,
      amount: amt,
      paymentMethod: 'PIX',
      paymentDate: new Date(),
      type: manualEntryType,
      notes: manualNotes || 'Lançamento Financeiro'
    });

    setShowManualModal(false);
    setManualAmount('');
    setManualNotes('');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Gestão Financeira & Extratos</h1>
          <p className="text-xs text-slate-500 font-bold">Acompanhe faturamento, recebimentos e extratos dos clientes</p>
        </div>
      </div>

      {/* Client Selection */}
      <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-4">
        <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Selecionar Cliente para Extrato</h3>
        <div className="relative">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Buscar cliente por nome..."
            className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 outline-none"
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {clients.slice(0, 6).map(client => (
            <div
              key={client.id}
              onClick={() => { setSelectedClient(client); setShowStatementModal(true); }}
              className="p-4 bg-slate-50 hover:bg-teal-50 border border-slate-200 hover:border-teal-300 rounded-2xl cursor-pointer transition-all flex items-center justify-between"
            >
              <div>
                <span className="font-black text-xs text-slate-900 block">{client.name}</span>
                <span className="text-[10px] text-slate-400 font-bold">{client.clinicName || 'Consultório'}</span>
              </div>
              <History size={18} className="text-teal-600" />
            </div>
          ))}
        </div>
      </div>

      {/* Statement Modal */}
      {showStatementModal && selectedClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in duration-200">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div>
                <h3 className="text-lg font-black text-slate-900">Extrato Financeiro - {selectedClient.name}</h3>
                <p className="text-xs text-slate-500 font-bold">Lançamentos por data de conclusão do caso</p>
              </div>
              <button onClick={() => setShowStatementModal(false)} className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 rounded-xl font-bold text-xs text-slate-700">
                Fechar
              </button>
            </div>

            {/* Filter Date Bar */}
            <div className="p-4 border-b border-slate-100 bg-white flex flex-col sm:flex-row justify-between items-center gap-3">
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={filterStartDate}
                  onChange={e => setFilterStartDate(e.target.value)}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none"
                />
                <span className="text-xs text-slate-400 font-bold">até</span>
                <input
                  type="date"
                  value={filterEndDate}
                  onChange={e => setFilterEndDate(e.target.value)}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none"
                />
              </div>
              <button
                onClick={() => setShowManualModal(true)}
                className="px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5"
              >
                <Plus size={14} /> Novo Lançamento
              </button>
            </div>

            {/* Statement Table */}
            <div className="flex-1 overflow-y-auto p-6">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-black uppercase text-slate-400 tracking-widest">
                    <th className="p-3">Data Conclusão/Lançamento</th>
                    <th className="p-3">Descrição / OS</th>
                    <th className="p-3 text-right">Valor</th>
                    <th className="p-3 text-right">Saldo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-bold text-slate-700">
                  <tr className="bg-slate-50/50 font-black">
                    <td className="p-3 text-slate-400">{filterStartDate}</td>
                    <td className="p-3 text-slate-500 uppercase tracking-widest">Saldo Anterior Carregado</td>
                    <td className="p-3 text-right">-</td>
                    <td className={`p-3 text-right ${chronoHistory.previousBalance < 0 ? 'text-red-500' : 'text-green-600'}`}>
                      R$ {chronoHistory.previousBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                  {chronoHistory.history.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-slate-400 italic">
                        Nenhum trabalho concluído ou lançamento neste período.
                      </td>
                    </tr>
                  ) : (
                    chronoHistory.history.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3 text-slate-500">
                          {new Date(item.date).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="p-3 font-black text-slate-800">
                          {item.description}
                        </td>
                        <td className={`p-3 text-right font-black ${item.type === 'DEBIT' ? 'text-red-600' : 'text-green-600'}`}>
                          {item.type === 'DEBIT' ? '-' : '+'} R$ {item.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                        <td className={`p-3 text-right font-black ${item.balanceAfter < 0 ? 'text-red-500' : 'text-green-600'}`}>
                          R$ {item.balanceAfter.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Manual Entry Modal */}
      {showManualModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl border border-slate-100">
            <h3 className="text-base font-black text-slate-900">Novo Lançamento Financeiro</h3>
            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Tipo</label>
                <select
                  value={manualEntryType}
                  onChange={e => setManualEntryType(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none"
                >
                  <option value="PAYMENT">Recebimento de Pagamento</option>
                  <option value="MANUAL_CREDIT">Crédito Manual</option>
                  <option value="MANUAL_DEBIT">Débito Manual</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Valor (R$)</label>
                <input
                  type="text"
                  value={manualAmount}
                  onChange={e => setManualAmount(e.target.value)}
                  placeholder="0,00"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Observações</label>
                <input
                  type="text"
                  value={manualNotes}
                  onChange={e => setManualNotes(e.target.value)}
                  placeholder="Ex: Pagamento PIX..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none"
                />
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowManualModal(false)}
                className="flex-1 py-2.5 bg-slate-100 text-slate-700 font-bold text-xs rounded-xl"
              >
                Cancelar
              </button>
              <button
                onClick={handleAddPayment}
                className="flex-1 py-2.5 bg-teal-500 text-white font-black text-xs rounded-xl shadow-md"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
