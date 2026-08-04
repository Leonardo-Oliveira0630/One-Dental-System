
import React from 'react';
import Barcode from 'react-barcode';
import { useApp } from '../context/AppContext';
import { UrgencyLevel } from '../types';
import { Printer, X, MapPin, User, Package, Truck, Clock } from 'lucide-react';
import { formatItemNameWithVariations } from '../pages/JobDetails';
import { formatTeethRange } from '../utils/toothUtils';

export const PrintOverlay = () => {
  const { printData, clearPrint, currentOrg, jobTypes, manualDentists, allUsers, jobs } = useApp();

  const job = React.useMemo(() => {
    if (!printData?.job) return null;
    const jobId = printData.job.id;
    return jobId ? (jobs.find(j => j.id === jobId) || printData.job) : printData.job;
  }, [printData, jobs]);

  const dentist = manualDentists?.find(d => d.id === job?.dentistId);
  const onlineDentist = allUsers?.find(u => u.id === job?.dentistId);
  const dentistCityState = dentist 
    ? `${dentist.city || ''}${dentist.city && dentist.state ? '/' : ''}${dentist.state || ''}`
    : onlineDentist 
        ? `${onlineDentist.city || ''}${onlineDentist.city && onlineDentist.state ? '/' : ''}${onlineDentist.state || ''}`
        : '';
        
  const formatAddress = (d: any) => {
    if (!d) return '';
    const parts = [];
    if (d.address) parts.push(d.address);
    if (d.number) parts.push(d.number);
    let str = parts.join(', ');
    if (d.complement) str += ` ${d.complement}`;
    if (d.neighborhood) str += ` - ${d.neighborhood}`;
    if (d.city || d.state) str += ` - ${d.city || ''}/${d.state || ''}`;
    if (d.cep) str += ` - CEP: ${d.cep}`;
    return str;
  };
  
  const dentistFullAddress = dentist ? formatAddress(dentist) : onlineDentist ? formatAddress(onlineDentist) : '';
    
  const calculateTotal = (job: any) => {
    let total = 0;
    job?.items?.forEach((item: any) => total += (item.price * item.quantity));
    job?.products?.forEach((prod: any) => total += (prod.unitPrice * prod.quantity));
    return total;
  };


  if (!printData) return null;

  const handlePrint = () => {
    window.print();
  };

  const labName = currentOrg?.name || 'SMILEPROX SYSTEM';
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
              Modo: {printData.mode === 'SHEET' ? 'Ficha Interna (A4 Meia Folha)' : printData.mode === 'INVOICE_SHEET' ? 'Ficha de Entrega (A4 Inteira)' : printData.mode === 'LABEL' ? 'Etiqueta Térmica' : printData.mode === 'ADDRESS_LABEL' ? 'Etiqueta de Endereço' : 'Roteiro de Rota'}
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
            printData.mode === 'SHEET' ? 'w-[210mm] min-h-[148.5mm] p-6 print:w-[210mm] print:min-h-[148.5mm] print:h-auto' : 
            printData.mode === 'INVOICE_SHEET' ? 'w-[210mm] min-h-[297mm] p-10 print:w-[210mm] print:min-h-[297mm] print:h-auto' : 
            printData.mode === 'ROUTE' ? 'w-[210mm] min-h-[297mm] p-12 print:w-[210mm] print:h-auto' : 
            'w-[50mm] h-[28mm] print:w-[50mm] print:h-[28mm] print:overflow-hidden relative print:m-0 print:p-0'
        }`}>
          
          {printData.mode === 'SHEET' && job && (
            <div className="flex flex-col text-sm">
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
                    <Barcode value={String(job.osNumber || job.id.substring(0,8))} width={2} height={40} displayValue={true} fontSize={14} margin={0} format="CODE128" />
                    <p className="text-[10px] mt-1 text-gray-500">Emissão: {new Date().toLocaleString()}</p>
                </div>
              </div>
              
              <div className="flex gap-3 mb-3">
                {/* Left column */}
                <div className="flex flex-col gap-2 flex-1">
                    <div className="border border-gray-300 p-2 rounded flex justify-between items-start">
                        <div className="overflow-hidden">
                            <p className="text-[10px] uppercase font-bold text-gray-500 mb-0.5 leading-none">Dentista / Clínica</p>
                            <p className="text-base font-bold leading-tight truncate mt-1">{job.dentistName}</p>
                        </div>
                        <div className="text-right shrink-0 ml-2">
                            <p className="text-[10px] uppercase font-bold text-gray-500 mb-0.5 leading-none">Cidade/UF</p>
                            <p className="text-xs font-bold leading-tight mt-1 text-gray-700">{dentistCityState || '-'}</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <div className="border border-gray-300 p-2 rounded relative flex-1">
                            <p className="text-[10px] uppercase font-bold text-gray-500 mb-0.5 leading-none">Paciente</p>
                            <p className="text-base font-bold leading-tight truncate mt-1">{job.patientName}</p>
                            {job.items.some(i => i.nature === 'REPETITION' || i.nature === 'ADJUSTMENT') && (
                                <div className="absolute top-2 right-2 px-2 py-0.5 bg-black text-white text-[10px] font-black uppercase rounded-sm">
                                    {job.items.find(i => i.nature === 'REPETITION' || i.nature === 'ADJUSTMENT')?.nature === 'REPETITION' ? 'REPETIÇÃO' : 'AJUSTE'}
                                </div>
                            )}
                        </div>
                        <div className="bg-gray-100 p-2 rounded w-24 shrink-0 flex flex-col justify-center items-center">
                            <p className="text-[10px] font-bold text-gray-500 leading-none mb-1">Caixa</p>
                            <p className="font-bold text-lg leading-none">{job.boxNumber || '-'}</p>
                        </div>
                        <div className="bg-gray-100 p-2 rounded w-24 shrink-0 flex flex-col justify-center items-center">
                            <p className="text-[10px] font-bold text-gray-500 leading-none mb-1">Prioridade</p>
                            <p className="font-bold text-xs uppercase leading-none">{job.urgency}</p>
                        </div>
                    </div>
                </div>
                
                {/* Right column */}
                <div className="flex flex-col gap-2 w-32 shrink-0">
                    <div className="bg-gray-100 p-2 rounded flex-1 flex flex-col justify-center items-center">
                        <p className="text-[10px] font-bold text-gray-500 leading-tight">Data Entrada</p>
                        <p className="font-mono text-sm leading-tight mt-0.5">{new Date(job.createdAt).toLocaleDateString()}</p>
                    </div>
                    <div className="bg-gray-100 p-2 rounded border-2 border-black flex-1 flex flex-col justify-center items-center">
                        <p className="text-[10px] font-bold text-gray-500 leading-tight">Data Saída (Prevista)</p>
                        <p className="font-mono text-sm font-bold leading-tight mt-0.5">{new Date(job.dueDate).toLocaleDateString()}</p>
                    </div>
                </div>
              </div>
              
              <div className="mb-3 flex flex-col">
                <h3 className="font-bold border-b border-black mb-1 pb-1 uppercase text-xs shrink-0">Serviços do Pedido</h3>
                <div className="">
                  <table className="w-full text-left text-xs">
                      <thead><tr className="border-b border-gray-300"><th className="py-1 w-10">Qtd</th><th className="py-1 w-20">Dentes</th><th className="py-1 w-16">Cor</th><th className="py-1">Descrição</th><th className="py-1 w-20">Natureza</th></tr></thead>
                      <tbody className="divide-y divide-gray-200">
                          {job.items.map((item, idx) => (
                              <tr key={`item-${idx}`}>
                                  <td className="py-1 font-bold align-top text-sm">{item.quantity}x</td>
                                  <td className="py-1 font-bold align-top text-[10px] text-indigo-600">{formatTeethRange(item.selectedTeeth) || '-'}</td>
                                  <td className="py-1 font-bold align-top text-[11px] text-slate-800">{item.color || (item as any).cor || '-'}</td>
                                  <td className="py-1 align-top font-bold text-sm"><div>{formatItemNameWithVariations(item, jobTypes)}</div></td>
                                  <td className="py-1 align-top text-gray-600 uppercase text-[10px] font-bold">{item.nature === 'REPETITION' ? 'REPETIÇÃO' : item.nature === 'ADJUSTMENT' ? 'AJUSTE' : 'NORMAL'}</td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
                </div>
                
                {job.products && job.products.length > 0 && (
                  <div className="mt-2">
                    <h3 className="font-bold border-b border-black mb-1 pb-1 uppercase text-xs shrink-0">Produtos do Pedido</h3>
                    <div className="">
                      <table className="w-full text-left text-xs">
                          <thead><tr className="border-b border-gray-300"><th className="py-1 w-12">Qtd</th><th className="py-1">Descrição</th><th className="py-1 w-24">Origem</th></tr></thead>
                          <tbody className="divide-y divide-gray-200">
                              {job.products.map((prod, idx) => (
                                  <tr key={`prod-${idx}`}><td className="py-1 font-bold align-top text-sm">{prod.quantity}x</td><td className="py-1 align-top font-bold text-sm"><div>{prod.name}</div></td><td className="py-1 align-top text-gray-600 uppercase text-[10px] font-bold">{prod.dentistOwnerId ? 'CLI' : 'LAB'}</td></tr>
                              ))}
                          </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="mb-2 border border-gray-300 p-2 rounded flex-1">
                <h3 className="font-bold text-[10px] uppercase text-gray-500 mb-1">Observações / Instruções</h3>
                <p className="whitespace-pre-wrap text-xs leading-relaxed">{job.notes || "Sem observações."}</p>
              </div>
              
              <div className="text-center mt-auto pt-2 border-t border-dashed border-gray-400 shrink-0"><p className="text-[10px] text-gray-500">Documento de Uso Interno - Gerado via LABPROX</p></div>
            </div>
          )}

          {printData.mode === 'INVOICE_SHEET' && job && (
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
                        <p className="text-xs">Ficha de Entrega / Fechamento</p>
                    </div>
                </div>
                <div className="flex flex-col items-end">
                    <Barcode value={String(job.osNumber || job.id.substring(0,8))} width={2} height={40} displayValue={true} fontSize={14} margin={0} format="CODE128" />
                    <p className="text-[10px] mt-1 text-gray-500">Emissão: {new Date().toLocaleString()}</p>
                </div>
              </div>
              
              <div className="flex gap-3 mb-3">
                <div className="flex flex-col gap-2 flex-1">
                    <div className="border border-gray-300 p-2 rounded flex flex-col items-start">
                        <div className="w-full mb-1">
                            <p className="text-[10px] uppercase font-bold text-gray-500 mb-0.5 leading-none">Dentista / Clínica</p>
                            <p className="text-base font-bold leading-tight truncate mt-1">{job.dentistName}</p>
                        </div>
                        <div className="w-full mt-1 pt-1 border-t border-gray-200">
                            <p className="text-[10px] uppercase font-bold text-gray-500 mb-0.5 leading-none">Endereço Completo</p>
                            <p className="text-xs font-bold leading-tight mt-1 text-gray-700 break-words">{dentistFullAddress || '-'}</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <div className="border border-gray-300 p-2 rounded relative flex-1">
                            <p className="text-[10px] uppercase font-bold text-gray-500 mb-0.5 leading-none">Paciente</p>
                            <p className="text-base font-bold leading-tight truncate mt-1">{job.patientName}</p>
                        </div>
                        <div className="bg-gray-100 p-2 rounded w-24 shrink-0 flex flex-col justify-center items-center">
                            <p className="text-[10px] font-bold text-gray-500 leading-none mb-1">Caixa</p>
                            <p className="font-bold text-lg leading-none">{job.boxNumber || '-'}</p>
                        </div>
                    </div>
                </div>
                
                <div className="flex flex-col gap-2 w-32 shrink-0">
                    <div className="bg-gray-100 p-2 rounded flex-1 flex flex-col justify-center items-center">
                        <p className="text-[10px] font-bold text-gray-500 leading-tight">Data Entrada</p>
                        <p className="font-mono text-sm leading-tight mt-0.5">{new Date(job.createdAt).toLocaleDateString()}</p>
                    </div>
                    <div className="bg-gray-100 p-2 rounded border-2 border-black flex-1 flex flex-col justify-center items-center">
                        <p className="text-[10px] font-bold text-gray-500 leading-tight">Data Saída</p>
                        <p className="font-mono text-sm font-bold leading-tight mt-0.5">{new Date(job.dueDate).toLocaleDateString()}</p>
                    </div>
                </div>
              </div>
              
              <div className="mb-3 flex flex-col">
                <h3 className="font-bold border-b border-black mb-1 pb-1 uppercase text-xs shrink-0">Serviços Executados</h3>
                <div className="">
                  <table className="w-full text-left text-xs">
                      <thead><tr className="border-b border-gray-300"><th className="py-1 w-12">Qtd</th><th className="py-1">Descrição</th><th className="py-1 w-24 text-right">Valor Unit.</th><th className="py-1 w-24 text-right">Total</th></tr></thead>
                      <tbody className="divide-y divide-gray-200">
                          {job.items.map((item, idx) => (
                              <tr key={`item-${idx}`}><td className="py-1 font-bold align-top text-sm">{item.quantity}x</td><td className="py-1 align-top font-bold text-sm"><div>{formatItemNameWithVariations(item, jobTypes)} {item.selectedTeeth?.length ? ` - Dentes: ${formatTeethRange(item.selectedTeeth)}` : ''}</div></td><td className="py-1 align-top text-right text-gray-700 text-sm">{(item.price || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td><td className="py-1 align-top font-bold text-right text-sm">{((item.price || 0) * item.quantity).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td></tr>
                          ))}
                      </tbody>
                  </table>
                </div>
                
                {job.products && job.products.length > 0 && (
                  <div className="mt-2">
                    <h3 className="font-bold border-b border-black mb-1 pb-1 uppercase text-xs shrink-0">Produtos</h3>
                    <div className="">
                      <table className="w-full text-left text-xs">
                          <thead><tr className="border-b border-gray-300"><th className="py-1 w-12">Qtd</th><th className="py-1">Descrição</th><th className="py-1 w-24 text-right">Valor Unit.</th><th className="py-1 w-24 text-right">Total</th></tr></thead>
                          <tbody className="divide-y divide-gray-200">
                              {job.products.map((prod, idx) => (
                                  <tr key={`prod-${idx}`}><td className="py-1 font-bold align-top text-sm">{prod.quantity}x</td><td className="py-1 align-top font-bold text-sm"><div>{prod.name}</div></td><td className="py-1 align-top text-right text-gray-700 text-sm">{(prod.unitPrice || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td><td className="py-1 align-top font-bold text-right text-sm">{((prod.unitPrice || 0) * prod.quantity).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td></tr>
                              ))}
                          </tbody>
                      </table>
                    </div>
                  </div>
                )}
                
                <div className="mt-4 pt-2 border-t-2 border-black flex justify-between items-center shrink-0">
                    <span className="font-black uppercase text-sm">Total do Serviço</span>
                    <span className="font-black text-xl">{calculateTotal(job).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                </div>
              </div>
              
              <div className="mt-auto pt-4 border-t border-dashed border-gray-400 shrink-0 text-center">
                  <div className="w-64 border-b border-black mx-auto mb-1"></div>
                  <p className="text-[10px] text-gray-500 uppercase font-bold">Assinatura do Recebedor</p>
                  <p className="text-[9px] text-gray-400 mt-2">Documento de Entrega - Gerado via LABPROX</p>
              </div>
            </div>
          )}

          {(printData.mode === 'LABEL' || printData.mode === 'ADDRESS_LABEL') && (
            <style>{`
              @page {
                size: 49mm 28mm;
                margin: 0;
              }

              @media print {
                html,
                body {
                  width: 49mm !important;
                  height: 28mm !important;
                  margin: 0 !important;
                  padding: 0 !important;
                  overflow: hidden !important;
                }

                body * {
                  visibility: hidden;
                }

                #slp-mrl-print,
                #slp-mrl-print * {
                  visibility: visible;
                }

                #slp-mrl-print {
                  position: fixed;
                  left: 0;
                  top: 0;
                  width: 49mm;
                  height: 28mm;
                  margin: 0;
                  padding: 1.5mm;
                  overflow: hidden;
                  box-sizing: border-box;
                  page-break-after: avoid;
                }
              }
            `}</style>
          )}

          {printData.mode === 'LABEL' && job && (
            <div 
              id="slp-mrl-print"
              className="w-[49mm] h-[28mm] print:w-[49mm] print:h-[28mm] overflow-hidden flex flex-col bg-white box-border" 
              style={{ fontFamily: 'Arial, Helvetica, sans-serif', color: 'black', paddingLeft: '2.9mm', paddingRight: '1.5mm', paddingTop: '2.5mm', paddingBottom: '2.5mm' }}
            > 
               {/* Patient Name */}
               <p className="font-bold text-[11px] leading-tight truncate uppercase w-full">{job.patientName}</p>
               {/* Dentist Name */}
               <p className="text-[10px] leading-tight truncate uppercase w-full">{job.dentistName}</p>
               
               {/* Bottom Section: Dates/OS on left, Barcode on right */}
               <div className="flex-1 flex flex-col justify-end mt-0.5">
                   <div className="flex justify-between items-center text-[10px] leading-tight mb-0.5">
                     <span>{new Date(job.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</span>
                     <span className="font-bold">{new Date(job.dueDate).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</span>
                     <span className="font-black">{job.osNumber || job.id.substring(0,8)}</span>
                   </div>
                   
                   <div className="w-full flex justify-center overflow-hidden">
                       <Barcode 
                         value={String(job.osNumber || job.id.substring(0,8))} 
                         width={2.0} 
                         height={45} 
                         displayValue={false}
                         margin={0} 
                         format="CODE128" 
                       />
                   </div>
               </div>
            </div>
          )}
          {printData.mode === 'ADDRESS_LABEL' && job && (
            <div 
              id="slp-mrl-print"
              className="w-[49mm] h-[28mm] print:w-[49mm] print:h-[28mm] overflow-hidden flex flex-col bg-white box-border" 
              style={{ fontFamily: 'Arial, Helvetica, sans-serif', color: 'black', paddingLeft: '2.9mm', paddingRight: '1mm', paddingTop: '1.5mm', paddingBottom: '1.5mm' }}
            >
               <div className="flex justify-between items-start mb-0.5">
                  <p className="font-black text-[11px] leading-tight">{job.osNumber || job.id.substring(0,8)}</p>
               </div>
               <div className="flex-1 flex flex-col justify-center space-y-0.5">
                  <p className="font-bold text-[9px] leading-tight truncate uppercase">DENT.: {job.dentistName}</p>
                  <p className="text-[9px] leading-tight truncate uppercase">PAC.: {job.patientName}</p>
                  <div className="mt-0.5 pt-0.5 border-t border-black/15">
                    <p className="text-[8px] font-bold leading-tight uppercase">ENDEREÇO:</p>
                    <p className="text-[8px] leading-tight uppercase line-clamp-3">
                      {dentistFullAddress || 'Endereço não cadastrado'}
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
