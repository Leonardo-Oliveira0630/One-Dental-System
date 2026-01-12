
import React from 'react';
import Barcode from 'react-barcode';
import { useApp } from '../context/AppContext';
import { UrgencyLevel } from '../types';
import { Printer, X, MapPin, User, Package, Truck, Clock } from 'lucide-react';

export const PrintOverlay = () => {
  const { printData, clearPrint, currentOrg } = useApp();

  if (!printData) return null;

  const handlePrint = () => {
    window.print();
  };

  const labName = currentOrg?.name || 'MY TOOTH SYSTEM';
  const labLogo = currentOrg?.logoUrl;

  return (
    <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm p-4 print:bg-white print:static print:block print:p-0">
      
      <div className="w-full max-w-4xl flex justify-between items-center p-4 text-white print:hidden">
        <div>
            <h2 className="text-xl font-bold">Pré-visualização de Impressão</h2>
            <p className="text-sm opacity-80">
              Modo: {printData.mode === 'SHEET' ? 'Ficha A4' : printData.mode === 'LABEL' ? 'Etiqueta Térmica' : 'Roteiro de Rota'}
            </p>
        </div>
        <div className="flex gap-3">
            <button onClick={clearPrint} className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg font-medium transition-colors flex items-center gap-2">
                <X size={18} /> Fechar
            </button>
            <button onClick={handlePrint} className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold shadow-lg shadow-blue-900/50 transition-colors flex items-center gap-2">
                <Printer size={18} /> Imprimir Agora
            </button>
        </div>
      </div>

      <div className="flex-1 w-full overflow-y-auto p-4 md:p-8 flex justify-center print:p-0 print:overflow-visible print:block">
        <div id="printable-content" className={`bg-white text-black shadow-2xl mx-auto print:shadow-none print:w-full print:h-full print:m-0 ${printData.mode === 'SHEET' || printData.mode === 'ROUTE' ? 'w-[210mm] min-h-[297mm] p-12' : 'w-[100mm] h-[50mm] p-2'}`}>
          
          {printData.mode === 'SHEET' && printData.job && (
            <div className="h-full flex flex-col">
              <div className="flex justify-between items-start border-b-2 border-black pb-4 mb-6">
                <div className="flex items-center gap-4">
                    {labLogo ? (
                        <div className="w-16 h-16 bg-white flex items-center justify-center rounded overflow-hidden border border-black/10">
                            <img src={labLogo} alt="Lab Logo" className="w-full h-full object-contain" />
                        </div>
                    ) : (
                        <div className="w-16 h-16 bg-black text-white flex items-center justify-center font-bold text-2xl rounded">
                            {labName.charAt(0)}
                        </div>
                    )}
                    <div>
                        <h1 className="text-2xl font-bold uppercase tracking-wide">{labName}</h1>
                        <p className="text-sm">Ficha de Produção Interna</p>
                    </div>
                </div>
                <div className="flex flex-col items-end">
                    <Barcode value={printData.job.osNumber || printData.job.id.substring(0,8)} width={3} height={60} displayValue={true} fontSize={20} margin={0} />
                    <p className="text-xs mt-1 text-gray-500">Emissão: {new Date().toLocaleString()}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-8 mb-8">
                <div className="border border-gray-300 p-4 rounded">
                    <p className="text-xs uppercase font-bold text-gray-500 mb-1">Dentista / Clínica</p>
                    <p className="text-xl font-bold">{printData.job.dentistName}</p>
                </div>
                <div className="border border-gray-300 p-4 rounded">
                    <p className="text-xs uppercase font-bold text-gray-500 mb-1">Paciente</p>
                    <p className="text-xl font-bold">{printData.job.patientName}</p>
                </div>
              </div>
              <div className="flex gap-4 mb-8">
                <div className="flex-1 bg-gray-100 p-3 rounded"><p className="text-xs font-bold text-gray-500">Data Entrada</p><p className="font-mono text-lg">{new Date(printData.job.createdAt).toLocaleDateString()}</p></div>
                 <div className="flex-1 bg-gray-100 p-3 rounded border-2 border-black"><p className="text-xs font-bold text-gray-500">Data Saída (Prevista)</p><p className="font-mono text-lg font-bold">{new Date(printData.job.dueDate).toLocaleDateString()}</p></div>
                <div className="flex-1 bg-gray-100 p-3 rounded"><p className="text-xs font-bold text-gray-500">Prioridade</p><p className="font-bold text-lg uppercase">{printData.job.urgency}</p></div>
                <div className="flex-1 bg-gray-100 p-3 rounded"><p className="text-xs font-bold text-gray-500">Caixa</p><p className="font-bold text-lg">{printData.job.boxNumber || '-'}</p></div>
              </div>
              <div className="mb-8 flex-1">
                <h3 className="font-bold border-b border-black mb-2 pb-1 uppercase text-sm">Itens do Pedido</h3>
                <table className="w-full text-left text-sm">
                    <thead><tr className="border-b border-gray-300"><th className="py-2">Qtd</th><th className="py-2">Descrição</th><th className="py-2">Natureza</th></tr></thead>
                    <tbody className="divide-y divide-gray-200">
                        {printData.job.items.map((item, idx) => (
                            <tr key={idx}><td className="py-3 font-bold align-top text-lg w-16">{item.quantity}x</td><td className="py-3 align-top font-bold text-base">{item.name}</td><td className="py-3 align-top text-gray-600 uppercase text-xs font-bold">{item.nature}</td></tr>
                        ))}
                    </tbody>
                </table>
              </div>
              <div className="mb-8 border border-gray-300 p-4 rounded min-h-[100px]"><h3 className="font-bold text-xs uppercase text-gray-500 mb-2">Observações / Instruções</h3><p className="whitespace-pre-wrap">{printData.job.notes || "Sem observações."}</p></div>
              <div className="text-center mt-auto pt-4 border-t border-dashed border-gray-400"><p className="text-xs text-gray-500">Documento de Uso Interno - Gerado via MY TOOTH</p></div>
            </div>
          )}

          {printData.mode === 'LABEL' && printData.job && (
            <div className="w-full h-full overflow-hidden relative flex flex-col items-center justify-between py-1">
               <div className="w-full flex justify-between items-center border-b border-black pb-1 px-1">
                  <div className="text-left w-2/3"><p className="font-bold text-sm leading-none truncate">{printData.job.patientName}</p><p className="text-[10px] text-gray-600 truncate">Dr. {printData.job.dentistName}</p></div>
                  <div className="text-right"><span className="font-bold text-lg leading-none">{printData.job.boxNumber ? `CX:${printData.job.boxNumber}` : ''}</span></div>
               </div>
               <div className="flex-1 flex items-center justify-center w-full my-1"><div className="transform scale-x-110"><Barcode value={printData.job.osNumber || printData.job.id.substring(0,8)} width={2.8} height={70} displayValue={true} fontSize={20} margin={0} /></div></div>
               <div className="w-full flex justify-between items-end border-t border-black pt-1 px-1"><div className="text-[10px] leading-tight"><p>E: {new Date(printData.job.createdAt).toLocaleDateString()}</p><p className="font-black text-[8px]">{labName}</p></div><div className="text-xs font-bold leading-tight"><p>S: {new Date(printData.job.dueDate).toLocaleDateString()}</p></div></div>
            </div>
          )}

          {printData.mode === 'ROUTE' && printData.routeItems && (
            <div className="h-full flex flex-col">
               <div className="flex justify-between items-center border-b-2 border-black pb-4 mb-6">
                  <div>
                    <h1 className="text-2xl font-black uppercase tracking-tight">Roteiro de Entregas</h1>
                    <div className="flex gap-4 mt-1 text-sm font-bold">
                        <span className="flex items-center gap-1 uppercase"><Truck size={16}/> {printData.driver}</span>
                        <span className="flex items-center gap-1 uppercase"><Clock size={16}/> {printData.shift === 'MORNING' ? 'MANHÃ' : 'TARDE'}</span>
                        <span className="flex items-center gap-1 uppercase"><Truck size={16}/> {printData.date}</span>
                    </div>
                  </div>
                  <div className="text-right">
                      <p className="font-black text-xl uppercase">{labName}</p>
                      <p className="text-xs">Gerado em: {new Date().toLocaleString()}</p>
                  </div>
               </div>

               <div className="space-y-4">
                  {printData.routeItems.map((item, idx) => (
                    <div key={item.id} className="border-2 border-black p-4 rounded-xl flex gap-4">
                       <div className="w-12 h-12 bg-black text-white rounded-full flex items-center justify-center font-black text-xl shrink-0">
                          {idx + 1}
                       </div>
                       <div className="flex-1">
                          <div className="flex justify-between items-start">
                             <div>
                                <h3 className="font-black text-lg uppercase leading-none">{item.dentistName}</h3>
                                <p className="text-sm font-bold text-gray-600 mb-2">{item.clinicName || 'Consultório'}</p>
                             </div>
                             <span className="px-2 py-1 bg-gray-200 text-black text-[10px] font-black rounded uppercase">
                                {item.type === 'DELIVERY' ? 'ENTREGA' : 'COLETA'}
                             </span>
                          </div>
                          
                          <div className="flex items-start gap-1 mb-2">
                             <MapPin size={16} className="shrink-0 mt-0.5" />
                             <p className="text-base font-bold leading-tight">{item.address}</p>
                          </div>

                          {item.patientName && (
                            <div className="flex items-center gap-2 p-2 bg-gray-50 border border-gray-200 rounded">
                                <User size={14} className="text-gray-400" />
                                <span className="text-xs font-bold">Paciente: {item.patientName}</span>
                            </div>
                          )}
                       </div>
                       {/* Área para rubrica do cliente */}
                       <div className="w-32 border-l border-dashed border-gray-300 pl-4 flex flex-col justify-end">
                           <div className="border-t border-black w-full mb-1"></div>
                           <p className="text-[8px] text-center uppercase font-bold">Rubrica / Hora</p>
                       </div>
                    </div>
                  ))}
               </div>

               <div className="mt-auto pt-8 text-center border-t border-dashed border-gray-300">
                  <p className="text-xs font-bold uppercase text-gray-500">Documento de uso logístico ProTrack - Boa viagem, motorista!</p>
               </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
