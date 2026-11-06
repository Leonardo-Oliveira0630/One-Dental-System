import React, { useState } from 'react';
import { Job } from '../types';
import { AlertTriangle, Calendar, CheckCircle2, RotateCcw, X, Clock } from 'lucide-react';

interface ReopenCompletionModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: Job;
  onConfirm: (completedAtIso: string, choiceSummary: string) => void;
}

export const ReopenCompletionModal: React.FC<ReopenCompletionModalProps> = ({
  isOpen,
  onClose,
  job,
  onConfirm
}) => {
  if (!isOpen) return null;

  const rawFirstDate = job.firstCompletedAt || job.completedAt || new Date().toISOString();
  const firstDateObj = new Date(rawFirstDate);
  const formattedFirstDate = !isNaN(firstDateObj.getTime())
    ? `${firstDateObj.toLocaleDateString('pt-BR')} às ${firstDateObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
    : new Date().toLocaleDateString('pt-BR');

  const now = new Date();
  const formattedCurrentDate = `${now.toLocaleDateString('pt-BR')} às ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;

  const [dateOption, setDateOption] = useState<'ORIGINAL' | 'CURRENT' | 'CUSTOM'>('ORIGINAL');
  const [customDate, setCustomDate] = useState<string>(now.toISOString().split('T')[0]);
  const [customTime, setCustomTime] = useState<string>(now.toTimeString().slice(0, 5));

  const handleConfirm = () => {
    let finalIso = now.toISOString();
    let choiceSummary = '';

    if (dateOption === 'ORIGINAL') {
      finalIso = new Date(rawFirstDate).toISOString();
      choiceSummary = `Mantida a data da 1ª finalização (${formattedFirstDate}) para preservar a competência da fatura original.`;
    } else if (dateOption === 'CURRENT') {
      finalIso = now.toISOString();
      choiceSummary = `Atualizada para a data atual (${formattedCurrentDate}) para faturamento no mês corrente.`;
    } else if (dateOption === 'CUSTOM') {
      if (customDate) {
        const [year, month, day] = customDate.split('-').map(Number);
        const [hours, minutes] = (customTime || '12:00').split(':').map(Number);
        const customObj = new Date(year, month - 1, day, hours || 0, minutes || 0);
        finalIso = customObj.toISOString();
        choiceSummary = `Definida data personalizada (${customObj.toLocaleDateString('pt-BR')} às ${customTime}) para competência da fatura.`;
      }
    }

    onConfirm(finalIso, choiceSummary);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-500 to-amber-600 px-6 py-5 text-white flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/20 rounded-2xl backdrop-blur-md">
              <RotateCcw size={22} className="text-white animate-spin-once" />
            </div>
            <div>
              <h3 className="font-black text-base leading-tight">Confirmar Data de Finalização</h3>
              <p className="text-xs text-amber-100 font-medium mt-0.5">
                Caso Reaberto • OS #{job.osNumber || job.id.slice(-4)} • {job.patientName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/20 rounded-xl text-white transition-colors"
            title="Fechar"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Explanation Alert */}
          <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-4 flex gap-3 text-amber-900 text-xs leading-relaxed">
            <AlertTriangle size={20} className="text-amber-600 shrink-0 mt-0.5" />
            <div>
              <strong className="font-extrabold block text-amber-950 mb-0.5">Auditoria de Competência da Fatura</strong>
              Este caso foi concluído originalmente em <strong className="font-black text-amber-950">{formattedFirstDate}</strong> e reaberto para alterações. Escolha qual data de finalização deve ser gravada para não afetar o fechamento financeiro do dentista:
            </div>
          </div>

          {/* Options */}
          <div className="space-y-3">
            {/* Option 1: First Completion Date */}
            <label
              onClick={() => setDateOption('ORIGINAL')}
              className={`flex items-start gap-3.5 p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                dateOption === 'ORIGINAL'
                  ? 'border-amber-500 bg-amber-50/40 shadow-sm'
                  : 'border-slate-100 bg-slate-50/60 hover:bg-slate-50 hover:border-slate-200'
              }`}
            >
              <input
                type="radio"
                name="completionDateChoice"
                checked={dateOption === 'ORIGINAL'}
                onChange={() => setDateOption('ORIGINAL')}
                className="mt-1 text-amber-600 focus:ring-amber-500"
              />
              <div className="space-y-1 w-full">
                <div className="flex items-center justify-between">
                  <span className="font-black text-xs text-slate-900 flex items-center gap-1.5">
                    <Calendar size={14} className="text-amber-600" /> Data da 1ª Finalização
                  </span>
                  <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-black uppercase rounded-lg border border-amber-200">
                    Recomendado
                  </span>
                </div>
                <p className="font-mono text-xs font-bold text-slate-800">{formattedFirstDate}</p>
                <p className="text-[11px] text-slate-500 font-medium leading-normal">
                  Mantém o faturamento na competência do mês original em que o trabalho foi entregue. Evita lançar cobranças indevidas no mês atual se a fatura anterior já foi fechada.
                </p>
              </div>
            </label>

            {/* Option 2: Current Date */}
            <label
              onClick={() => setDateOption('CURRENT')}
              className={`flex items-start gap-3.5 p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                dateOption === 'CURRENT'
                  ? 'border-amber-500 bg-amber-50/40 shadow-sm'
                  : 'border-slate-100 bg-slate-50/60 hover:bg-slate-50 hover:border-slate-200'
              }`}
            >
              <input
                type="radio"
                name="completionDateChoice"
                checked={dateOption === 'CURRENT'}
                onChange={() => setDateOption('CURRENT')}
                className="mt-1 text-amber-600 focus:ring-amber-500"
              />
              <div className="space-y-1 w-full">
                <span className="font-black text-xs text-slate-900 flex items-center gap-1.5">
                  <Clock size={14} className="text-slate-600" /> Data Atual (Hoje)
                </span>
                <p className="font-mono text-xs font-bold text-slate-800">{formattedCurrentDate}</p>
                <p className="text-[11px] text-slate-500 font-medium leading-normal">
                  Atualiza a data de conclusão para hoje, faturando o serviço e eventuais novos itens no mês atual.
                </p>
              </div>
            </label>

            {/* Option 3: Custom Date */}
            <label
              onClick={() => setDateOption('CUSTOM')}
              className={`flex items-start gap-3.5 p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                dateOption === 'CUSTOM'
                  ? 'border-amber-500 bg-amber-50/40 shadow-sm'
                  : 'border-slate-100 bg-slate-50/60 hover:bg-slate-50 hover:border-slate-200'
              }`}
            >
              <input
                type="radio"
                name="completionDateChoice"
                checked={dateOption === 'CUSTOM'}
                onChange={() => setDateOption('CUSTOM')}
                className="mt-1 text-amber-600 focus:ring-amber-500"
              />
              <div className="space-y-2 w-full">
                <span className="font-black text-xs text-slate-900 flex items-center gap-1.5">
                  <Calendar size={14} className="text-slate-600" /> Data Personalizada
                </span>
                <p className="text-[11px] text-slate-500 font-medium leading-normal">
                  Selecione manualmente a data e horário de competência para o faturamento.
                </p>
                {dateOption === 'CUSTOM' && (
                  <div className="grid grid-cols-2 gap-2 pt-1 animate-in fade-in duration-150">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Data</label>
                      <input
                        type="date"
                        value={customDate}
                        onChange={(e) => setCustomDate(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-amber-500"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Horário</label>
                      <input
                        type="time"
                        value={customTime}
                        onChange={(e) => setCustomTime(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>
                )}
              </div>
            </label>
          </div>
        </div>

        {/* Footer actions */}
        <div className="p-5 bg-slate-50 border-t border-slate-100 flex gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 px-4 bg-white hover:bg-slate-100 text-slate-700 font-extrabold text-xs rounded-2xl border border-slate-200 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="flex-1 py-3 px-4 bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs rounded-2xl shadow-lg shadow-amber-500/25 transition-all flex items-center justify-center gap-2"
          >
            <CheckCircle2 size={16} /> Confirmar Finalização
          </button>
        </div>
      </div>
    </div>
  );
};
