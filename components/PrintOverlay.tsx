
import React from 'react';
import Barcode from 'react-barcode';
import { useApp } from '../context/AppContext';
import { UrgencyLevel } from '../types';
import { Printer, X, MapPin, User, Package, Truck, Clock, FileText, Calendar } from 'lucide-react';
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
    if (d.address) {
      let line = d.address;
      if (d.number) line += `, ${d.number}`;
      if (d.complement) line += ` - ${d.complement}`;
      parts.push(line);
    }
    if (d.neighborhood) parts.push(d.neighborhood);
    if (d.city || d.state) parts.push(`${d.city || ''}${d.city && d.state ? '/' : ''}${d.state || ''}`);
    if (d.cep) parts.push(`CEP: ${d.cep}`);
    return parts.length > 0 ? parts.join(' - ') : (typeof d.address === 'string' ? d.address : '');
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

  const labName = currentOrg?.name || 'Labprox SYSTEM';
  const labLogo = currentOrg?.logoUrl;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm p-4 print:bg-white print:static print:block print:p-0">
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
              Modo: {printData.mode === 'SHEET' ? 'Ficha Interna (A4 Meia Folha)' : printData.mode === 'INVOICE_SHEET' ? 'Ficha de Entrega (A4 Inteira)' : printData.mode === 'BUDGET_SHEET' ? 'Orçamento (A4)' : printData.mode === 'LABEL' ? 'Etiqueta Térmica' : printData.mode === 'ADDRESS_LABEL' ? 'Etiqueta de Endereço' : 'Roteiro de Rota'}
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

      <div className="flex-1 w-full overflow-y-auto p-4 md:p-4 sm:p-8 flex justify-center print:p-0 print:overflow-visible print:block">
        <div id="printable-content" className={`bg-white text-black shadow-2xl mx-auto print:shadow-none print:m-0 break-inside-avoid ${
            printData.mode === 'SHEET' ? 'w-[210mm] min-h-[148.5mm] p-6 print:w-[210mm] print:min-h-[148.5mm] print:h-auto' : 
            printData.mode === 'INVOICE_SHEET' || printData.mode === 'BUDGET_SHEET' ? 'w-[210mm] min-h-[297mm] p-10 print:w-[210mm] print:min-h-[297mm] print:h-auto' : 
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
                            <p className="text-[10px] uppercase font-bold text-gray-500 mb-0.5 leading-none">Cliente / Clínica</p>
                            <p className="text-[10pt] font-bold leading-tight truncate mt-1">{job.dentistName}</p>
                            {job.subDentistName && (
                                <div className="mt-2 pt-1 border-t border-gray-100">
                                    <p className="text-[9px] uppercase font-bold text-gray-500 mb-0.5 leading-none">Dentista Solicitante</p>
                                    <p className="text-[10pt] font-bold leading-tight mt-0.5">{job.subDentistName}</p>
                                </div>
                            )}
                        </div>
                        <div className="text-right shrink-0 ml-2">
                            <p className="text-[10px] uppercase font-bold text-gray-500 mb-0.5 leading-none">Cidade/UF</p>
                            <p className="text-xs font-bold leading-tight mt-1 text-gray-700">{dentistCityState || '-'}</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <div className="border border-gray-300 p-2 rounded relative flex-1">
                            <p className="text-[10px] uppercase font-bold text-gray-500 mb-0.5 leading-none">Paciente</p>
                            <p className="text-[10pt] font-bold leading-tight truncate mt-1">{job.patientName}</p>
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
                  <table className="w-full text-left text-xs border-collapse border border-gray-400">
                      <thead><tr className="border-b border-gray-400"><th className="py-1 px-1 border border-gray-400 w-[4ch] text-center">Qtd</th><th className="py-1 px-1 border border-gray-400 w-20 text-center">Dentes</th><th className="py-1 px-1 border border-gray-400 w-[6ch] text-center">Cor</th><th className="py-1 px-1 border border-gray-400">Descrição</th></tr></thead>
                      <tbody className="divide-y divide-gray-400">
                          {job.items.filter(i => !i.isInternalStep).map((item, idx) => (
                              <tr key={`item-${idx}`}>
                                  <td className="py-1 px-1 border border-gray-400 font-bold align-top text-sm text-center">{item.quantity}</td>
                                  <td className="py-1 px-1 border border-gray-400 font-bold align-top text-[10px] text-indigo-600 text-center">{formatTeethRange(item.selectedTeeth) || '-'}</td>
                                  <td className="py-1 px-1 border border-gray-400 font-bold align-top text-[11px] text-slate-800 break-words text-center">{item.color || (item as any).cor || '-'}</td>
                                  <td className="py-1 px-1 border border-gray-400 align-top font-bold text-[10pt]"><div>{item.nature === 'REPETITION' ? '(R)' : item.nature === 'ADJUSTMENT' ? '(A)' : ''}{formatItemNameWithVariations(item, jobTypes)}</div></td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
                </div>
                
                {job.products && job.products.length > 0 && (
                  <div className="mt-2">
                    <h3 className="font-bold border-b border-black mb-1 pb-1 uppercase text-xs shrink-0">Produtos do Pedido</h3>
                    <div className="">
                      <table className="w-full text-left text-xs border-collapse border border-gray-400">
                          <thead><tr className="border-b border-gray-400"><th className="py-1 px-1 border border-gray-400 w-12">Qtd</th><th className="py-1 px-1 border border-gray-400">Descrição</th><th className="py-1 px-1 border border-gray-400 w-24">Origem</th></tr></thead>
                          <tbody className="divide-y divide-gray-400">
                              {job.products.map((prod, idx) => (
                                  <tr key={`prod-${idx}`}><td className="py-1 px-1 border border-gray-400 font-bold align-top text-sm">{prod.quantity}x</td><td className="py-1 px-1 border border-gray-400 align-top font-bold text-sm"><div>{prod.name}</div></td><td className="py-1 px-1 border border-gray-400 align-top text-gray-600 uppercase text-[10px] font-bold">{prod.dentistOwnerId ? 'CLI' : 'LAB'}</td></tr>
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
              
              {job.receivedMaterials && job.receivedMaterials.length > 0 && (
                <div className="border border-gray-400 p-2 rounded shrink-0">
                  <h3 className="font-bold text-[10px] uppercase text-gray-500 mb-1">Materiais Enviados pelo Dentista</h3>
                  <div className="grid grid-cols-3 gap-1">
                    {job.receivedMaterials.map((mat, i) => {
                      const qty = job.receivedMaterialQuantities?.[mat];
                      const displayName = qty ? `${qty}x ${mat}` : mat;
                      return (
                        <div key={i} className="flex items-center gap-1">
                          <div className="w-2 h-2 bg-black shrink-0"></div>
                          <span className="text-[10px] leading-tight truncate">{displayName}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              
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
                            <p className="text-[10px] uppercase font-bold text-gray-500 mb-0.5 leading-none">Cliente / Clínica</p>
                            <p className="text-[10pt] font-bold leading-tight truncate mt-1">{job.dentistName}</p>
                            {job.subDentistName && (
                                <div className="mt-2 pt-1 border-t border-gray-100">
                                    <p className="text-[9px] uppercase font-bold text-gray-500 mb-0.5 leading-none">Dentista Solicitante</p>
                                    <p className="text-[10pt] font-bold leading-tight mt-0.5">{job.subDentistName}</p>
                                </div>
                            )}
                        </div>
                        <div className="w-full mt-1 pt-1 border-t border-gray-200">
                            <p className="text-[10px] uppercase font-bold text-gray-500 mb-0.5 leading-none">Endereço Completo</p>
                            <p className="text-xs font-bold leading-tight mt-1 text-gray-700 break-words">{dentistFullAddress || '-'}</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <div className="border border-gray-300 p-2 rounded relative flex-1">
                            <p className="text-[10px] uppercase font-bold text-gray-500 mb-0.5 leading-none">Paciente</p>
                            <p className="text-[10pt] font-bold leading-tight truncate mt-1">{job.patientName}</p>
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
                  <table className="w-full text-left text-xs border-collapse border border-gray-400">
                      <thead><tr className="border-b border-gray-400"><th className="py-1 px-1 border border-gray-400 w-[4ch]">Qtd</th><th className="py-1 px-1 border border-gray-400">Descrição</th><th className="py-1 px-1 border border-gray-400 w-24 text-right">Valor Unit.</th><th className="py-1 px-1 border border-gray-400 w-24 text-right">Total</th></tr></thead>
                      <tbody className="divide-y divide-gray-400">
                          {job.items.filter(i => !i.isInternalStep).map((item, idx) => (
                              <tr key={`item-${idx}`}><td className="py-1 px-1 border border-gray-400 font-bold align-top text-sm text-center">{item.quantity}</td><td className="py-1 px-1 border border-gray-400 align-top font-bold text-[10pt]"><div>{item.nature === 'REPETITION' ? '(R)' : item.nature === 'ADJUSTMENT' ? '(A)' : ''}{formatItemNameWithVariations(item, jobTypes)} {item.selectedTeeth?.length ? ` - Dentes: ${formatTeethRange(item.selectedTeeth)}` : ''}</div></td><td className="py-1 px-1 border border-gray-400 align-top text-right text-gray-700 text-sm">{(item.price || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td><td className="py-1 px-1 border border-gray-400 align-top font-bold text-right text-sm">{((item.price || 0) * item.quantity).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td></tr>
                          ))}
                      </tbody>
                  </table>
                </div>
                  
                {job.products && job.products.length > 0 && (
                  <div className="mt-2">
                    <h3 className="font-bold border-b border-black mb-1 pb-1 uppercase text-xs shrink-0">Produtos</h3>
                    <div className="">
                      <table className="w-full text-left text-xs border-collapse border border-gray-400">
                          <thead><tr className="border-b border-gray-400"><th className="py-1 px-1 border border-gray-400 w-12">Qtd</th><th className="py-1 px-1 border border-gray-400">Descrição</th><th className="py-1 px-1 border border-gray-400 w-24 text-right">Valor Unit.</th><th className="py-1 px-1 border border-gray-400 w-24 text-right">Total</th></tr></thead>
                          <tbody className="divide-y divide-gray-400">
                              {job.products.map((prod, idx) => (
                                  <tr key={`prod-${idx}`}><td className="py-1 px-1 border border-gray-400 font-bold align-top text-sm">{prod.quantity}x</td><td className="py-1 px-1 border border-gray-400 align-top font-bold text-sm"><div>{prod.name}</div></td><td className="py-1 px-1 border border-gray-400 align-top text-right text-gray-700 text-sm">{(prod.unitPrice || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td><td className="py-1 px-1 border border-gray-400 align-top font-bold text-right text-sm">{((prod.unitPrice || 0) * prod.quantity).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td></tr>
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


          {printData.mode === 'BUDGET_SHEET' && job && (
             <div className="space-y-6">
                <div className="flex justify-between items-start border-b-2 border-slate-900 pb-4">
                   <div className="flex items-center gap-4">
                      {currentOrg?.logoUrl ? <img src={currentOrg.logoUrl} alt="Logo" className="w-16 h-16 object-contain" /> : <div className="w-16 h-16 bg-slate-100 flex items-center justify-center rounded-lg text-slate-400"><FileText size={24}/></div>}
                      <div>
                         <h1 className="text-2xl font-black uppercase text-slate-900">{currentOrg?.name || 'Laboratório'}</h1>
                         <p className="text-xs text-slate-600 font-medium">Orçamento Formal de Serviços</p>
                         <p className="text-[10px] text-slate-500">{new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR')}</p>
                      </div>
                   </div>
                   <div className="text-right">
                      <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-1">Nº Orçamento</p>
                      <p className="text-3xl font-black text-slate-900 font-mono tracking-tighter">{job.osNumber}</p>
                   </div>
                </div>

                <div className="grid grid-cols-2 gap-6 border-b border-slate-200 pb-6">
                   <div>
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Cliente</p>
                       <p className="font-bold text-slate-900 uppercase">{job.dentistName}</p>
                       {job.subDentistName && <p className="text-xs text-slate-600 uppercase">A/C: {job.subDentistName}</p>}
                       <p className="text-xs text-slate-500 uppercase mt-2">Paciente: <span className="font-bold text-slate-800">{job.patientName}</span></p>
                   </div>
                </div>

                <div>
                   <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-3">Serviços Orçados</h3>
                   <table className="w-full text-left text-xs mb-4">
                      <thead>
                         <tr className="border-b-2 border-slate-900 text-slate-500">
                            <th className="py-2 font-black uppercase">Item / Dente(s)</th>
                            <th className="py-2 font-black uppercase text-center w-16">Qtd</th>
                            <th className="py-2 font-black uppercase text-right w-24">Valor Un.</th>
                            <th className="py-2 font-black uppercase text-right w-24">Total</th>
                         </tr>
                      </thead>
                      <tbody>
                         {job.items?.map((item: any) => (
                             <tr key={item.id} className="border-b border-slate-100">
                                 <td className="py-3">
                                     <div className="font-bold text-slate-800">{item.name}</div>
                                     <div className="text-[10px] text-slate-500">{item.selectedTeeth?.join(', ')}</div>
                                 </td>
                                 <td className="py-3 text-center font-bold text-slate-700">{item.selectedTeeth?.length || 1}</td>
                                 <td className="py-3 text-right text-slate-600">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((item.price || 0) / (item.selectedTeeth?.length || 1))}</td>
                                 <td className="py-3 text-right font-bold text-slate-900">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.price)}</td>
                             </tr>
                         ))}
                         {job.products?.map((prod: any) => (
                             <tr key={prod.id} className="border-b border-slate-100">
                                 <td className="py-3">
                                     <div className="font-bold text-slate-800">{prod.name}</div>
                                 </td>
                                 <td className="py-3 text-center font-bold text-slate-700">{prod.quantity}</td>
                                 <td className="py-3 text-right text-slate-600">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(prod.unitPrice)}</td>
                                 <td className="py-3 text-right font-bold text-slate-900">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(prod.unitPrice * prod.quantity)}</td>
                             </tr>
                         ))}
                      </tbody>
                   </table>
                   <div className="flex justify-end pt-4">
                       <div className="text-right">
                           <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Total do Orçamento</p>
                           <p className="text-3xl font-black text-slate-900 tracking-tighter">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(job.totalValue || 0)}</p>
                       </div>
                   </div>
                </div>

                <div className="mt-12 pt-8 border-t border-slate-200">
                   <p className="text-[10px] text-slate-400 font-bold uppercase text-center mb-6">Este documento é uma estimativa de custos e não tem valor fiscal.</p>
                   <div className="flex justify-center gap-16">
                       <div className="text-center w-64">
                           <div className="border-t border-slate-400 pt-2 mt-12">
                               <p className="text-xs font-bold text-slate-800 uppercase">{currentOrg?.name || 'Laboratório'}</p>
                           </div>
                       </div>
                       <div className="text-center w-64">
                           <div className="border-t border-slate-400 pt-2 mt-12">
                               <p className="text-xs font-bold text-slate-800 uppercase">De Acordo (Cliente)</p>
                           </div>
                       </div>
                   </div>
                </div>
             </div>
          )}
          {printData.mode === 'LABEL' && job && (
            <div 
              id="slp-mrl-print"
              className="w-[49mm] h-[28mm] print:w-[49mm] print:h-[28mm] overflow-hidden flex flex-col bg-white box-border" 
              style={{ fontFamily: 'Arial, Helvetica, sans-serif', color: 'black', paddingLeft: '2.9mm', paddingRight: '1.5mm', paddingTop: '2.5mm', paddingBottom: '2.5mm' }}
            > 
               {/* Dentist Name */}
               <p className="font-bold text-[11px] leading-tight truncate uppercase w-full">{job.dentistName}</p>
               {/* Patient Name */}
               <p className="text-[10px] leading-tight truncate uppercase w-full">{job.patientName}</p>
               
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
               <p className="font-bold text-[10px] leading-tight truncate uppercase">{job.dentistName}</p>
               <p className="text-[9px] leading-tight truncate uppercase">{job.patientName}</p>
               <div className="flex justify-between items-start my-0.5">
                  <p className="font-black text-[11px] leading-tight">OS: {job.osNumber || job.id.substring(0,8)}</p>
               </div>
               <div className="flex-1 flex flex-col justify-end space-y-0.5">
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
               <div className="flex justify-between items-center border-b border-black pb-2 mb-4">
                  <div>
                    <h1 className="text-xl font-black uppercase tracking-tight">Roteiro de Entregas</h1>
                    <div className="flex gap-4 mt-1 text-xs font-bold">
                        <span className="flex items-center gap-1 uppercase"><Truck size={14}/> {printData.driver}</span>
                        <span className="flex items-center gap-1 uppercase"><Clock size={14}/> {printData.shift === 'MORNING' ? 'MANHÃ' : 'TARDE'}</span>
                        <span className="flex items-center gap-1 uppercase"><Calendar size={14}/> {printData.date}</span>
                    </div>
                  </div>
                  <div className="text-right">
                      <p className="font-black text-sm uppercase">{labName}</p>
                      <p className="text-[10px] uppercase">Gerado: {new Date().toLocaleString()}</p>
                  </div>
               </div>

               <div className="w-full">
                   <table className="w-full border-collapse">
                      <thead>
                         <tr className="border-b border-black text-left text-[10px] uppercase">
                            <th className="w-8 py-1">Ord.</th>
                            <th className="py-1">Cliente / Endereço</th>
                            <th className="py-1">Serviços / Observações</th>
                            <th className="w-24 py-1 text-center">Assinatura</th>
                         </tr>
                      </thead>
                      <tbody>
                         {(() => {
                            const groups = new Map<string, typeof printData.routeItems>();
                            const sortedItems = [...printData.routeItems].sort((a, b) => (a.order || 0) - (b.order || 0));
                            sortedItems.forEach(item => {
                               if (!groups.has(item.dentistId)) groups.set(item.dentistId, []);
                               groups.get(item.dentistId)!.push(item);
                            });
                            return Array.from(groups.values()).map((group, idx) => (
                               <tr key={idx} className="border-b border-gray-300">
                                  <td className="py-2 align-top">
                                     <div className="w-5 h-5 bg-black text-white rounded-full flex items-center justify-center font-bold text-xs">
                                        {idx + 1}
                                     </div>
                                  </td>
                                  <td className="py-2 pr-2 align-top">
                                     <h3 className="font-bold text-[10pt] uppercase leading-tight">{group[0].dentistName}</h3>
                                     <p className="text-[9px] font-bold text-gray-600 leading-tight mb-1 uppercase">{group[0].clinicName || 'Consultório'}</p>
                                     <p className="text-[9px] leading-tight flex items-start gap-0.5 uppercase"><MapPin size={10} className="shrink-0 mt-0.5"/> {group[0].address}</p>
                                  </td>
                                  <td className="py-2 pr-2 align-top text-[9px]">
                                     {group.map((item, i) => (
                                         <div key={i} className="mb-1 border border-gray-200 rounded p-1 bg-gray-50">
                                             <div className="font-bold uppercase mb-0.5 flex items-center justify-between">
                                                 <span>{item.type === 'DELIVERY' ? 'ENTREGA' : 'COLETA'}{item.patientName ? ` - ${item.patientName}` : ''}</span>
                                             </div>
                                             {item.observations && <div className="text-[8px] text-gray-800 font-bold uppercase leading-tight">OBS: {item.observations}</div>}
                                         </div>
                                     ))}
                                  </td>
                                  <td className="py-2 align-bottom pb-4">
                                     <div className="w-full border-t border-black pt-0.5">
                                         <p className="text-[7px] text-center uppercase font-bold text-gray-500">Recebedor / Hora</p>
                                     </div>
                                  </td>
                               </tr>
                            ));
                         })()}
                      </tbody>
                   </table>
               </div>

               <div className="mt-auto pt-4 text-center border-t border-dashed border-gray-300">
                  <p className="text-[9px] font-bold uppercase text-gray-500">Documento de uso logístico - Boa viagem, motorista!</p>
               </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
