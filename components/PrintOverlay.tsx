
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
      <style>
        {`
          @media print {
            @page {
              size: ${printData.mode === 'LABEL' || printData.mode === 'ADDRESS_LABEL' ? '50mm 28mm' : 'A4 portrait'};
              margin: 0;
            }
            body {
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
              margin: 0;
              padding: 0;
            }
            /* Disable anti-aliasing for thermal printers to avoid dithering (serrilhado) */
            .thermal-print {
              -webkit-font-smoothing: none;
              -moz-osx-font-smoothing: grayscale;
              text-rendering: optimizeSpeed;
              color: black !important;
            }
          }
        `}
      </style>
      
      <div className="w-full max-w-4xl flex justify-between items-center p-4 text-white print:hidden">
        <div>
            <h2 className="text-xl font-bold">Pré-visualização de Impressão</h2>
            <p className="text-sm opacity-80">
              Modo: {printData.mode === 'SHEET' ? 'Ficha A4 (Meia Folha)' : printData.mode === 'LABEL' ? 'Etiqueta Térmica' : printData.mode === 'ADDRESS_LABEL' ? 'Etiqueta de Endereço' : 'Roteiro de Rota'}
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
        <div id="printable-content" className={`bg-white text-black shadow-2xl mx-auto print:shadow-none print:m-0 break-inside-avoid ${
            printData.mode === 'SHEET' ? 'w-[210mm] h-[148.5mm] p-6 print:w-[210mm] print:h-[148.5mm] overflow-hidden' : 
            printData.mode === 'ROUTE' ? 'w-[210mm] min-h-[297mm] p-12 print:w-[210mm] print:h-auto' : 
            'w-[50mm] h-[28mm] print:w-[50mm] print:h-[28mm] print:overflow-hidden relative print:m-0 print:p-0'
        }`}>
          
          {printData.mode === 'SHEET' && printData.job && (
            <div className="h-full flex flex-col text-sm">
              <div className="flex justify-between items-start border-b-2 border-black pb-2 mb-3">
                <div className="flex items-center gap-3">
                    {labLogo ? (
                        <div className="w-12 h-12 bg-white flex items-center justify-center rounded overflow-hidden border border-black/10">
                            <img src={labLogo} alt="Lab Logo" className="w-full h-full object-contain" />
                        </div>
                    ) : (
                        <div className="w-12 h-12 bg-black text-white flex items-center justify-center font-bold text-xl rounded">
                            {labName.charAt(0)}
                        </div>
                    )}
                    <div>
                        <h1 className="text-xl font-bold uppercase tracking-wide leading-none">{labName}</h1>
                        <p className="text-xs">Ficha de Produção Interna</p>
                    </div>
                </div>
                <div className="flex flex-col items-end">
                    <Barcode value={String(printData.job.osNumber || printData.job.id.substring(0,8))} width={2} height={40} displayValue={true} fontSize={14} margin={0} format="CODE128" />
                    <p className="text-[10px] mt-1 text-gray-500">Emissão: {new Date().toLocaleString()}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-3">
                <div className="border border-gray-300 p-2 rounded">
                    <p className="text-[10px] uppercase font-bold text-gray-500 mb-0.5">Dentista / Clínica</p>
                    <p className="text-base font-bold leading-tight truncate">{printData.job.dentistName}</p>
                </div>
                <div className="border border-gray-300 p-2 rounded relative">
                    <p className="text-[10px] uppercase font-bold text-gray-500 mb-0.5">Paciente</p>
                    <p className="text-base font-bold leading-tight truncate">{printData.job.patientName}</p>
                    {printData.job.items.some(i => i.nature === 'REPETITION' || i.nature === 'ADJUSTMENT') && (
                        <div className="absolute top-2 right-2 px-2 py-0.5 bg-black text-white text-[10px] font-black uppercase rounded-sm">
                            {printData.job.items.find(i => i.nature === 'REPETITION' || i.nature === 'ADJUSTMENT')?.nature === 'REPETITION' ? 'REPETIÇÃO' : 'AJUSTE'}
                        </div>
                    )}
                </div>
              </div>
              
              <div className="flex gap-2 mb-3">
                <div className="flex-1 bg-gray-100 p-2 rounded"><p className="text-[10px] font-bold text-gray-500">Data Entrada</p><p className="font-mono text-sm">{new Date(printData.job.createdAt).toLocaleDateString()}</p></div>
                 <div className="flex-1 bg-gray-100 p-2 rounded border-2 border-black"><p className="text-[10px] font-bold text-gray-500">Data Saída (Prevista)</p><p className="font-mono text-sm font-bold">{new Date(printData.job.dueDate).toLocaleDateString()}</p></div>
                <div className="flex-1 bg-gray-100 p-2 rounded"><p className="text-[10px] font-bold text-gray-500">Prioridade</p><p className="font-bold text-sm uppercase">{printData.job.urgency}</p></div>
                <div className="flex-1 bg-gray-100 p-2 rounded"><p className="text-[10px] font-bold text-gray-500">Caixa</p><p className="font-bold text-sm">{printData.job.boxNumber || '-'}</p></div>
              </div>
              
              <div className="mb-3 flex-1 overflow-hidden flex flex-col">
                <h3 className="font-bold border-b border-black mb-1 pb-1 uppercase text-xs shrink-0">Itens do Pedido</h3>
                <div className="overflow-hidden flex-1">
                  <table className="w-full text-left text-xs">
                      <thead><tr className="border-b border-gray-300"><th className="py-1 w-12">Qtd</th><th className="py-1">Descrição</th><th className="py-1 w-24">Natureza</th></tr></thead>
                      <tbody className="divide-y divide-gray-200">
                          {printData.job.items.map((item, idx) => (
                              <tr key={idx}><td className="py-1 font-bold align-top text-sm">{item.quantity}x</td><td className="py-1 align-top font-bold text-sm"><div className="line-clamp-2">{item.name}</div></td><td className="py-1 align-top text-gray-600 uppercase text-[10px] font-bold">{item.nature === 'REPETITION' ? 'REPETIÇÃO' : item.nature === 'ADJUSTMENT' ? 'AJUSTE' : 'NORMAL'}</td></tr>
                          ))}
                      </tbody>
                  </table>
                </div>
              </div>
              
              <div className="mb-2 border border-gray-300 p-2 rounded h-[60px] shrink-0 overflow-hidden"><h3 className="font-bold text-[10px] uppercase text-gray-500 mb-1">Observações / Instruções</h3><p className="whitespace-pre-wrap text-xs line-clamp-2">{printData.job.notes || "Sem observações."}</p></div>
              
              <div className="text-center mt-auto pt-2 border-t border-dashed border-gray-400 shrink-0"><p className="text-[10px] text-gray-500">Documento de Uso Interno - Gerado via MY TOOTH</p></div>
            </div>
          )}

          {printData.mode === 'LABEL' && printData.job && (
            <div 
              className="w-[50mm] h-[28mm] print:w-[50mm] print:h-[28mm] overflow-hidden flex bg-white thermal-print px-3 py-2" 
              style={{ fontFamily: 'Arial, Helvetica, sans-serif', color: 'black' }}
            >
               {/* Left Column: Information (Stacked exactly like the image) */}
               <div className="flex-1 flex flex-col justify-center space-y-0.5">
                  <p className="font-bold text-[12px] leading-tight truncate uppercase">{printData.job.patientName}</p>
                  <p className="text-[11px] leading-tight truncate uppercase">{printData.job.dentistName}</p>
                  <p className="text-[11px] leading-tight">{printData.job.osNumber || printData.job.id.substring(0,8)}</p>
                  <p className="text-[11px] leading-tight">
                    {new Date(printData.job.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} {new Date(printData.job.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                  <p className="text-[11px] leading-tight">
                    {new Date(printData.job.dueDate).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                  </p>
                  {printData.job.items.some(i => i.nature === 'REPETITION' || i.nature === 'ADJUSTMENT') && (
                      <p className="text-[10px] font-black uppercase leading-tight mt-0.5">
                          {printData.job.items.find(i => i.nature === 'REPETITION' || i.nature === 'ADJUSTMENT')?.nature === 'REPETITION' ? '*** REPETIÇÃO ***' : '*** AJUSTE ***'}
                      </p>
                  )}
               </div>

               {/* Right Column: Box Number and Barcode */}
               <div className="w-[20mm] flex flex-col items-center justify-center">
                  {printData.job.boxNumber && (
                    <p className="font-bold text-[15px] leading-none mb-1">CX: {printData.job.boxNumber}</p>
                  )}
                  <div className="flex items-center justify-center">
                    <Barcode 
                      value={String(printData.job.osNumber || printData.job.id.substring(0,8))} 
                      width={1.1} 
                      height={50} 
                      displayValue={false} 
                      margin={0} 
                      format="CODE128" 
                    />
                  </div>
               </div>
            </div>
          )}

          {printData.mode === 'ADDRESS_LABEL' && printData.job && (
            <div 
              className="w-[50mm] h-[28mm] print:w-[50mm] print:h-[28mm] overflow-hidden flex flex-col bg-white thermal-print px-3 py-2" 
              style={{ fontFamily: 'Arial, Helvetica, sans-serif', color: 'black' }}
            >
               <div className="flex justify-between items-start mb-1">
                  <p className="font-black text-[14px] leading-tight">{printData.job.osNumber || printData.job.id.substring(0,8)}</p>
               </div>
               <div className="flex-1 flex flex-col justify-center space-y-0.5">
                  <p className="font-bold text-[11px] leading-tight truncate uppercase">DENTISTA: {printData.job.dentistName}</p>
                  <p className="text-[11px] leading-tight truncate uppercase">PACIENTE: {printData.job.patientName}</p>
                  <div className="mt-1 pt-1 border-t border-black/10">
                    <p className="text-[9px] font-bold leading-tight uppercase">ENDEREÇO:</p>
                    <p className="text-[9px] leading-tight uppercase line-clamp-2">
                      {(() => {
                        const { manualDentists, allUsers } = useApp();
                        const dentist = manualDentists.find(d => d.id === printData.job?.dentistId);
                        const onlineDentist = allUsers.find(u => u.id === printData.job?.dentistId);
                        if (dentist) {
                          return `${dentist.address || ''}, ${dentist.number || ''} ${dentist.complement || ''} - ${dentist.neighborhood || ''} - ${dentist.city || ''}/${dentist.state || ''}`;
                        }
                        return onlineDentist?.address || 'Endereço não cadastrado';
                      })()}
                    </p>
                  </div>
               </div>
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
