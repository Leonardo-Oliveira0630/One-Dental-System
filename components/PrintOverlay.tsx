import React from 'react';
import Barcode from 'react-barcode';
import { useApp } from '../context/AppContext';
import { UrgencyLevel } from '../types';
import { Printer, X } from 'lucide-react';

export const PrintOverlay = () => {
  const { printData, clearPrint } = useApp();

  if (!printData) return null;

  const { job, mode } = printData;
  const osNum = job.osNumber || job.id.substring(0, 8);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm print:bg-white print:static print:block">
      
      {/* Control Bar (Hidden on Print) */}
      <div className="w-full max-w-4xl flex justify-between items-center p-4 text-white print:hidden">
        <div>
            <h2 className="text-xl font-bold">Pré-visualização de Impressão</h2>
            <p className="text-sm opacity-80">Modo: {mode === 'SHEET' ? 'Ficha A4' : 'Etiqueta Térmica'}</p>
        </div>
        <div className="flex gap-3">
            <button 
                onClick={clearPrint}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg font-medium transition-colors flex items-center gap-2"
            >
                <X size={18} /> Fechar
            </button>
            <button 
                onClick={handlePrint}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold shadow-lg shadow-blue-900/50 transition-colors flex items-center gap-2"
            >
                <Printer size={18} /> Imprimir Agora
            </button>
        </div>
      </div>

      {/* Scrollable Container for Preview */}
      <div className="flex-1 w-full overflow-y-auto p-4 md:p-8 flex justify-center print:p-0 print:overflow-visible print:block">
        
        {/* Printable Paper Area */}
        <div 
            id="printable-content"
            className={`bg-white text-black shadow-2xl mx-auto print:shadow-none print:w-full print:h-full print:m-0 ${
                mode === 'SHEET' ? 'w-[210mm] min-h-[297mm] p-12' : 'w-[100mm] h-[50mm] p-2'
            }`}
        >
          
          {/* --- MODE: WORK SHEET (A4) --- */}
          {mode === 'SHEET' && (
            <div className="h-full flex flex-col">
              {/* Header */}
              <div className="flex justify-between items-start border-b-2 border-black pb-4 mb-6">
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-black text-white flex items-center justify-center font-bold text-2xl rounded">
                        OD
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold uppercase tracking-wide">ONE DENTAL SYSTEM</h1>
                        <p className="text-sm">Ficha de Produção Interna</p>
                    </div>
                </div>
                {/* Barcode at the TOP RIGHT - LARGE */}
                <div className="flex flex-col items-end">
                    <Barcode value={osNum} width={3} height={60} displayValue={true} fontSize={20} margin={0} />
                    <p className="text-xs mt-1 text-gray-500">Emissão: {new Date().toLocaleString()}</p>
                </div>
              </div>

              {/* Main Info Grid */}
              <div className="grid grid-cols-2 gap-8 mb-8">
                <div className="border border-gray-300 p-4 rounded">
                    <p className="text-xs uppercase font-bold text-gray-500 mb-1">Dentista / Clínica</p>
                    <p className="text-xl font-bold">{job.dentistName}</p>
                </div>
                <div className="border border-gray-300 p-4 rounded">
                    <p className="text-xs uppercase font-bold text-gray-500 mb-1">Paciente</p>
                    <p className="text-xl font-bold">{job.patientName}</p>
                </div>
              </div>

              {/* Dates & Urgency */}
              <div className="flex gap-4 mb-8">
                <div className="flex-1 bg-gray-100 p-3 rounded">
                    <p className="text-xs font-bold text-gray-500">Data Entrada</p>
                    <p className="font-mono text-lg">{new Date(job.createdAt).toLocaleDateString()}</p>
                </div>
                 <div className="flex-1 bg-gray-100 p-3 rounded border-2 border-black">
                    <p className="text-xs font-bold text-gray-500">Data Saída (Prevista)</p>
                    <p className="font-mono text-lg font-bold">{new Date(job.dueDate).toLocaleDateString()}</p>
                </div>
                <div className="flex-1 bg-gray-100 p-3 rounded">
                    <p className="text-xs font-bold text-gray-500">Prioridade</p>
                    <p className={`font-bold text-lg ${job.urgency === UrgencyLevel.VIP ? 'uppercase' : ''}`}>
                        {job.urgency}
                    </p>
                </div>
                <div className="flex-1 bg-gray-100 p-3 rounded">
                    <p className="text-xs font-bold text-gray-500">Caixa</p>
                    <p className="font-bold text-lg">{job.boxNumber || '-'} ({job.boxColor?.name})</p>
                </div>
              </div>

              {/* Items Table */}
              <div className="mb-8 flex-1">
                <h3 className="font-bold border-b border-black mb-2 pb-1 uppercase text-sm">Itens do Pedido</h3>
                <table className="w-full text-left text-sm">
                    <thead>
                        <tr className="border-b border-gray-300">
                            <th className="py-2">Qtd</th>
                            <th className="py-2">Descrição</th>
                            <th className="py-2">Variações/Obs</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {job.items.map((item, idx) => (
                            <tr key={idx}>
                                <td className="py-3 font-bold align-top text-lg w-16">{item.quantity}x</td>
                                <td className="py-3 align-top font-bold text-base">{item.name}</td>
                                <td className="py-3 align-top text-gray-600">
                                    {item.selectedVariationIds && item.selectedVariationIds.length > 0 
                                        ? 'Com variações selecionadas' 
                                        : '-'}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
              </div>

              {/* Notes */}
              <div className="mb-8 border border-gray-300 p-4 rounded min-h-[100px]">
                 <h3 className="font-bold text-xs uppercase text-gray-500 mb-2">Observações / Instruções</h3>
                 <p className="whitespace-pre-wrap">{job.notes || "Sem observações."}</p>
              </div>

              {/* Footer text only */}
              <div className="text-center mt-auto pt-4 border-t border-dashed border-gray-400">
                 <p className="text-xs text-gray-500">Documento Interno - ONE DENTAL SYSTEM</p>
              </div>
            </div>
          )}

          {/* --- MODE: LABEL (Sticker ~10x5cm) --- */}
          {mode === 'LABEL' && (
            <div className="w-full h-full overflow-hidden relative flex flex-col items-center justify-between py-1">
               {/* Top Info */}
               <div className="w-full flex justify-between items-center border-b border-black pb-1 px-1">
                  <div className="text-left w-2/3">
                      <p className="font-bold text-sm leading-none truncate">{job.patientName}</p>
                      <p className="text-[10px] text-gray-600 truncate">Dr. {job.dentistName}</p>
                  </div>
                  <div className="text-right">
                      <span className="font-bold text-lg leading-none">{job.boxNumber ? `CX:${job.boxNumber}` : ''}</span>
                  </div>
               </div>

               {/* HUGE Barcode Area */}
               <div className="flex-1 flex items-center justify-center w-full my-1">
                  <div className="transform scale-x-110">
                      <Barcode 
                        value={osNum} 
                        width={2.8} 
                        height={70} 
                        displayValue={true} 
                        fontSize={20}
                        margin={0} 
                        textMargin={0}
                      />
                  </div>
               </div>

               {/* Bottom Info */}
               <div className="w-full flex justify-between items-end border-t border-black pt-1 px-1">
                   <div className="text-[10px] leading-tight">
                       <p>E: {new Date(job.createdAt).toLocaleDateString()}</p>
                   </div>
                   <div className="text-xs font-bold leading-tight">
                       <p>S: {new Date(job.dueDate).toLocaleDateString()}</p>
                   </div>
               </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};